import * as cheerio from 'cheerio';

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi;

const DUMMY_DOMAINS = [
    'example.com',
    'domain.com',
    'yourcompany.com',
    'test.com',
    'email.com',
    'wixpress.com',
    'sentry.io',
    'cloudflare.com',
    'bootstrap.com',
    'wordpress.org',
    'googleapis.com'
];

const IGNORED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.css', '.js', '.woff', '.woff2'];

/**
 * Extracts and cleans emails from HTML text and mailto links.
 */
export function extractEmailsFromHtml(html) {
    if (!html) return [];
    const emails = new Set();
    const $ = cheerio.load(html);

    // 1. Check mailto links
    $('a[href^="mailto:"]').each((_, el) => {
        const href = $(el).attr('href') || '';
        const mail = href.replace(/^mailto:/i, '').split('?')[0].trim().toLowerCase();
        if (isValidEmail(mail)) {
            emails.add(mail);
        }
    });

    // 2. Scan entire body text via regex
    const bodyText = $('body').text();
    const matches = bodyText.match(EMAIL_REGEX) || [];
    for (const match of matches) {
        const cleaned = match.trim().toLowerCase();
        if (isValidEmail(cleaned)) {
            emails.add(cleaned);
        }
    }

    return Array.from(emails);
}

function isValidEmail(email) {
    if (!email || email.length < 5 || email.length > 80) return false;
    if (IGNORED_EXTENSIONS.some(ext => email.endsWith(ext))) return false;
    const domain = email.split('@')[1];
    if (!domain || DUMMY_DOMAINS.includes(domain)) return false;
    if (email.startsWith('info@example') || email.startsWith('user@')) return false;
    return true;
}

/**
 * Extracts social media profile links from HTML.
 */
export function extractSocialsFromHtml(html) {
    const socials = {
        linkedin: null,
        instagram: null,
        facebook: null,
        twitter: null,
        youtube: null,
        tiktok: null,
    };

    if (!html) return socials;
    const $ = cheerio.load(html);

    $('a[href]').each((_, el) => {
        const href = $(el).attr('href') || '';
        if (!href.startsWith('http')) return;

        const url = href.toLowerCase();

        if (!socials.linkedin && url.includes('linkedin.com/') && !url.includes('share') && !url.includes('intent')) {
            socials.linkedin = href.split('?')[0];
        } else if (!socials.instagram && url.includes('instagram.com/') && !url.includes('/p/')) {
            socials.instagram = href.split('?')[0];
        } else if (!socials.facebook && url.includes('facebook.com/') && !url.includes('sharer') && !url.includes('plugins')) {
            socials.facebook = href.split('?')[0];
        } else if (!socials.twitter && (url.includes('twitter.com/') || url.includes('x.com/')) && !url.includes('share')) {
            socials.twitter = href.split('?')[0];
        } else if (!socials.youtube && (url.includes('youtube.com/c/') || url.includes('youtube.com/@') || url.includes('youtube.com/channel/'))) {
            socials.youtube = href.split('?')[0];
        } else if (!socials.tiktok && url.includes('tiktok.com/@')) {
            socials.tiktok = href.split('?')[0];
        }
    });

    return socials;
}

/**
 * Extracts phone numbers from tel: links and common patterns.
 */
export function extractPhonesFromHtml(html) {
    if (!html) return [];
    const phones = new Set();
    const $ = cheerio.load(html);

    $('a[href^="tel:"]').each((_, el) => {
        const href = $(el).attr('href') || '';
        const phone = href.replace(/^tel:/i, '').trim();
        if (phone && phone.length >= 7) {
            phones.add(phone);
        }
    });

    return Array.from(phones);
}

/**
 * Finds contact / about page URLs from the homepage.
 */
export function findContactPageUrls(html, baseUrl) {
    if (!html || !baseUrl) return [];
    const contactUrls = new Set();
    const $ = cheerio.load(html);

    const keywords = ['contact', 'kontakt', 'about', 'o-nas', 'impressum', 'reach-us', 'uber-uns'];

    $('a[href]').each((_, el) => {
        const href = $(el).attr('href') || '';
        const text = $(el).text().toLowerCase();
        const lowerHref = href.toLowerCase();

        const matchesKeyword = keywords.some(k => lowerHref.includes(k) || text.includes(k));

        if (matchesKeyword) {
            try {
                const resolved = new URL(href, baseUrl);
                // Ensure same host
                const baseHost = new URL(baseUrl).hostname;
                if (resolved.hostname === baseHost) {
                    contactUrls.add(resolved.href);
                }
            } catch {
                // Invalid URL, ignore
            }
        }
    });

    return Array.from(contactUrls).slice(0, 3); // Max 3 contact pages
}
