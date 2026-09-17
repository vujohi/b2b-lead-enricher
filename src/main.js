import { Actor } from 'apify';
import { PlaywrightCrawler, log } from 'crawlee';
import { scrapeGoogleMapsSearch } from './maps.js';
import { extractEmailsFromHtml, extractSocialsFromHtml, extractPhonesFromHtml, findContactPageUrls } from './extractors.js';

await Actor.init();

const input = (await Actor.getInput()) ?? {};
const {
    searchQueries = ['Software houses in Warsaw'],
    directUrls = [],
    maxPlacesPerQuery = 20,
    deepWebsiteEnrichment = true,
    extractEmails = true,
    extractSocials = true,
    extractPhones = true,
} = input;

log.info('Starting B2B Lead & Contact Deep Enricher...', {
    queriesCount: searchQueries.length,
    directUrlsCount: directUrls.length,
    maxPlacesPerQuery,
    deepWebsiteEnrichment,
});

// Configure proxies if available (Apify platform supplies residential/datacenter proxies automatically)
let proxyConfiguration;
try {
    proxyConfiguration = await Actor.createProxyConfiguration();
} catch (e) {
    log.warning('Running without proxy configuration (local run).');
}

const allLeads = [];

// 1. Process Direct URLs if provided
if (Array.isArray(directUrls) && directUrls.length > 0) {
    log.info(`Processing ${directUrls.length} direct company website(s)...`);
    for (const rawUrl of directUrls) {
        let cleanUrl = rawUrl.trim();
        if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
            cleanUrl = `https://${cleanUrl}`;
        }
        allLeads.push({
            query: 'direct_url',
            title: new URL(cleanUrl).hostname.replace(/^www\./, ''),
            category: null,
            rating: null,
            reviewsCount: null,
            address: null,
            phone: null,
            website: cleanUrl,
            googleMapsUrl: null,
        });
    }
}

// 2. Process Google Maps queries if provided
if (Array.isArray(searchQueries) && searchQueries.length > 0) {
    const mapsCrawler = new PlaywrightCrawler({
        proxyConfiguration,
        maxConcurrency: 2,
        requestHandlerTimeoutSecs: 180,
        launchContext: {
            launchOptions: {
                args: ['--disable-gpu', '--no-sandbox', '--disable-setuid-sandbox'],
            },
        },
        async requestHandler({ page, request }) {
            const query = request.userData.query;
            const places = await scrapeGoogleMapsSearch(page, query, maxPlacesPerQuery);
            allLeads.push(...places);
        },
    });

    const mapsRequests = searchQueries.map(q => ({
        url: `https://www.google.com/maps/search/${encodeURIComponent(q)}/?hl=en`,
        userData: { query: q },
        uniqueKey: `maps_${q}`,
    }));

    await mapsCrawler.run(mapsRequests);
}

log.info(`Total base leads collected: ${allLeads.length}. Starting deep website contact enrichment...`);

// 3. Deep Website Enrichment (Visiting company websites to extract emails, phones, and social profiles)
for (let i = 0; i < allLeads.length; i++) {
    const lead = allLeads[i];
    lead.emails = [];
    lead.phones = lead.phone ? [lead.phone] : [];
    lead.socials = {
        linkedin: null,
        instagram: null,
        facebook: null,
        twitter: null,
        youtube: null,
        tiktok: null,
    };
    lead.enriched = false;
    lead.scrapedAt = new Date().toISOString();

    if (deepWebsiteEnrichment && lead.website) {
        try {
            log.info(`[${i + 1}/${allLeads.length}] Enriching: ${lead.title} (${lead.website})`);

            // Fetch homepage with 15s timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);

            const res = await fetch(lead.website, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.9',
                },
                signal: controller.signal,
                redirect: 'follow',
            }).catch(() => null);

            clearTimeout(timeoutId);

            if (res && res.ok) {
                const html = await res.text().catch(() => '');

                if (extractEmails) {
                    const homeEmails = extractEmailsFromHtml(html);
                    homeEmails.forEach(e => { if (!lead.emails.includes(e)) lead.emails.push(e); });
                }

                if (extractSocials) {
                    lead.socials = extractSocialsFromHtml(html);
                }

                if (extractPhones) {
                    const homePhones = extractPhonesFromHtml(html);
                    homePhones.forEach(p => { if (!lead.phones.includes(p)) lead.phones.push(p); });
                }

                // If no email found on homepage, check up to 2 contact pages
                if (extractEmails && lead.emails.length === 0) {
                    const contactPages = findContactPageUrls(html, lead.website);
                    for (const contactUrl of contactPages.slice(0, 2)) {
                        try {
                            const cCtrl = new AbortController();
                            const cTimeout = setTimeout(() => cCtrl.abort(), 10000);
                            const cRes = await fetch(contactUrl, {
                                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
                                signal: cCtrl.signal,
                                redirect: 'follow',
                            }).catch(() => null);
                            clearTimeout(cTimeout);

                            if (cRes && cRes.ok) {
                                const cHtml = await cRes.text().catch(() => '');
                                const subEmails = extractEmailsFromHtml(cHtml);
                                subEmails.forEach(e => { if (!lead.emails.includes(e)) lead.emails.push(e); });
                                if (lead.emails.length > 0) break;
                            }
                        } catch {
                            // Ignore subpage timeout
                        }
                    }
                }

                lead.enriched = true;
            }
        } catch (err) {
            log.debug(`Could not enrich website for ${lead.title}: ${err.message}`);
        }
    }

    // Push each lead record immediately into the Apify Dataset
    await Actor.pushData(lead);
}

log.info(`Completed! Successfully processed and saved ${allLeads.length} leads.`);

await Actor.exit();
