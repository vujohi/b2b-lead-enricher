import { describe, it, expect } from 'vitest';
import {
    extractEmailsFromHtml,
    extractSocialsFromHtml,
    extractPhonesFromHtml,
    findContactPageUrls,
} from '../src/extractors.js';

describe('Contact & Social Extractors', () => {
    const sampleHtml = `
        <!DOCTYPE html>
        <html>
        <head><title>Acme Studio</title></head>
        <body>
            <header>
                <a href="tel:+48221234567">+48 22 123 4567</a>
                <a href="mailto:kontakt@acmestudio.pl">kontakt@acmestudio.pl</a>
            </header>
            <main>
                <p>Welcome to Acme Studio. Write to us at hello@acmestudio.pl or support@acmestudio.pl.</p>
                <p>Don't email fake image test.png or test@example.com.</p>
            </main>
            <footer>
                <a href="/o-nas">O nas</a>
                <a href="/kontakt">Kontakt</a>
                <a href="https://www.linkedin.com/company/acme-studio">LinkedIn</a>
                <a href="https://instagram.com/acmestudio">Instagram</a>
                <a href="https://facebook.com/acmestudiopl">Facebook</a>
            </footer>
        </body>
        </html>
    `;

    it('extracts valid emails and ignores dummy domains and images', () => {
        const emails = extractEmailsFromHtml(sampleHtml);
        expect(emails).toContain('kontakt@acmestudio.pl');
        expect(emails).toContain('hello@acmestudio.pl');
        expect(emails).toContain('support@acmestudio.pl');
        expect(emails).not.toContain('test@example.com');
    });

    it('extracts direct social links correctly', () => {
        const socials = extractSocialsFromHtml(sampleHtml);
        expect(socials.linkedin).toBe('https://www.linkedin.com/company/acme-studio');
        expect(socials.instagram).toBe('https://instagram.com/acmestudio');
        expect(socials.facebook).toBe('https://facebook.com/acmestudiopl');
        expect(socials.twitter).toBeNull();
    });

    it('extracts telephone numbers', () => {
        const phones = extractPhonesFromHtml(sampleHtml);
        expect(phones).toContain('+48221234567');
    });

    it('identifies internal contact links', () => {
        const contactLinks = findContactPageUrls(sampleHtml, 'https://acmestudio.pl');
        expect(contactLinks).toContain('https://acmestudio.pl/kontakt');
        expect(contactLinks).toContain('https://acmestudio.pl/o-nas');
    });
});
