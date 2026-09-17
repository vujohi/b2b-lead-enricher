import { log } from 'crawlee';

/**
 * Handles Google Maps search and scrolls the feed to extract places.
 */
export async function scrapeGoogleMapsSearch(page, query, maxPlaces = 20) {
    const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(query)}/?hl=en`;
    log.info(`Navigating to Google Maps for query: "${query}"`, { searchUrl });

    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeoutSecs: 60 });

    // Handle Google Consent Dialog (common in EU)
    try {
        const consentSelectors = [
            'button:has-text("Accept all")',
            'button:has-text("I agree")',
            'button:has-text("Zgadzam się")',
            'button:has-text("Alle akzeptieren")',
            'form[action*="consent"] button',
            'button[aria-label*="Accept"]'
        ];
        for (const selector of consentSelectors) {
            const btn = page.locator(selector).first();
            if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
                log.info(`Dismissing consent banner using selector: ${selector}`);
                await btn.click();
                await page.waitForTimeout(2000);
                break;
            }
        }
    } catch {
        // No consent dialog
    }

    // Wait for the results feed or a single place result
    const feedSelector = 'div[role="feed"]';
    try {
        await page.waitForSelector(feedSelector, { timeout: 15000 });
    } catch {
        log.warning(`Results feed not found immediately for query "${query}". Checking for single place redirect...`);
    }

    const places = [];
    const seenUrls = new Set();

    let scrollAttempts = 0;
    const maxScrollAttempts = Math.min(Math.ceil(maxPlaces / 3) + 5, 40);

    while (places.length < maxPlaces && scrollAttempts < maxScrollAttempts) {
        scrollAttempts++;

        // Extract visible place cards
        const cardElements = await page.$$('div.Nv2PK, div[role="article"]');
        for (const card of cardElements) {
            try {
                // Link element
                const linkEl = await card.$('a.hfpxzc, a[href*="/maps/place/"]');
                const placeUrl = linkEl ? await linkEl.getAttribute('href') : null;

                if (!placeUrl || seenUrls.has(placeUrl)) continue;
                seenUrls.add(placeUrl);

                // Title
                const titleEl = await card.$('div.qBF1Pd, div.fontHeadlineSmall');
                const title = titleEl ? (await titleEl.innerText()).trim() : (linkEl ? await linkEl.getAttribute('aria-label') : 'Unknown');

                // Rating & Reviews
                const ratingEl = await card.$('span.MW4etd');
                const rating = ratingEl ? parseFloat(await ratingEl.innerText()) : null;

                const reviewsEl = await card.$('span.UY7F9');
                let reviewsCount = null;
                if (reviewsEl) {
                    const revText = await reviewsEl.innerText();
                    const numMatch = revText.replace(/[^0-9]/g, '');
                    if (numMatch) reviewsCount = parseInt(numMatch, 10);
                }

                // Sub-info lines (Category, Address, Phone)
                const infoLines = await card.$$eval('div.W4Efsd', els => els.map(e => e.innerText.trim()).filter(Boolean));

                let category = null;
                let address = null;
                let phone = null;

                if (infoLines.length > 0) {
                    const firstLine = infoLines[0].split('·').map(s => s.trim());
                    category = firstLine[firstLine.length - 1] || null;
                }
                if (infoLines.length > 1) {
                    address = infoLines[1];
                }

                // Website link inside the card
                const websiteEl = await card.$('a[data-value="Website"], a[aria-label*="website" i], a.lcr4fd');
                let website = websiteEl ? await websiteEl.getAttribute('href') : null;

                // Extract coordinates from place URL
                let latitude = null;
                let longitude = null;
                const coordsMatch = placeUrl.match(/!3d(-?[0-9.]+)!4d(-?[0-9.]+)/);
                if (coordsMatch) {
                    latitude = parseFloat(coordsMatch[1]);
                    longitude = parseFloat(coordsMatch[2]);
                }

                places.push({
                    query,
                    title,
                    category,
                    rating,
                    reviewsCount,
                    address,
                    phone,
                    website,
                    googleMapsUrl: placeUrl,
                    latitude,
                    longitude,
                });

                if (places.length >= maxPlaces) break;
            } catch (err) {
                log.debug(`Error parsing place card: ${err.message}`);
            }
        }

        // Scroll the feed down
        const scrolled = await page.evaluate((selector) => {
            const feed = document.querySelector(selector);
            if (feed) {
                feed.scrollTop += 1200;
                return true;
            }
            return false;
        }, feedSelector);

        if (!scrolled) break;
        await page.waitForTimeout(1500);

        // Check for end of list banner
        const isEnd = await page.$('span.HlvSq');
        if (isEnd) {
            log.info(`Reached the end of Google Maps results for "${query}".`);
            break;
        }
    }

    log.info(`Extracted ${places.length} places for query "${query}".`);
    return places;
}
