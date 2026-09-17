# B2B Lead & Contact Deep Enricher (Email, Socials & Google Maps)

> **All-in-one B2B Lead Generation Tool**: Find businesses on Google Maps, extract verified direct emails, phone numbers, and social media profiles (LinkedIn, Instagram, Facebook, Twitter/X, YouTube, TikTok) directly from their websites.

---

## 🚀 Why use this Actor over standard Google Maps scrapers?

Most Google Maps scrapers stop at the place card: they give you a phone number and a name, but **never give you the actual email address or direct social profiles** because Google Maps doesn't display them.

**B2B Lead & Contact Deep Enricher** solves this by executing a two-stage extraction:
1. **Maps Discovery**: Finds businesses by your search keywords and locations.
2. **Deep Website Contact Enrichment**: Automatically navigates to each business's website (homepage, `/contact`, `/about`, `/kontakt`), parses the HTML, filters out junk/dummy emails, and extracts verified business emails, phone numbers, and direct social media handles.

You can also bypass Google Maps completely and provide a **bulk list of company websites** to enrich existing databases in seconds.

---

## ⚡ Key Features

* 📍 **Google Maps Search**: Search any niche in any city or country (e.g., *"Software houses in Warsaw"*, *"Marketing agencies Berlin"*, *"Dentists Chicago"*).
* 🌐 **Bulk Website List Enrichment**: Paste existing website domains or URLs to extract contact data in bulk.
* ✉️ **Clean Email Extraction**: Scrapes `mailto:` links and runs deep regex with automatic spam/dummy domain filtering (`example.com`, tracking pixels, image extensions).
* 🔗 **Social Media Discovery**: Automatically captures LinkedIn company pages, Instagram handles, Facebook pages, Twitter/X, TikTok, and YouTube channels.
* 📞 **Phone Normalization**: Extracts direct telephone numbers from both Google Maps and website headers/footers.
* 📁 **Export Anywhere**: Download results instantly as **JSON, CSV, Excel (XLSX)**, or pipe into Zapier, Make, HubSpot, or any CRM.

---

## 📥 Input Options

| Field | Type | Description | Default |
| :--- | :--- | :--- | :--- |
| `searchQueries` | Array of Strings | Keywords to search on Google Maps (e.g., `["Gyms London", "Plumbers Austin"]`) | `["Software houses in Warsaw"]` |
| `directUrls` | Array of Strings | Optional: List of company websites to enrich directly without searching Maps | `[]` |
| `maxPlacesPerQuery` | Integer | Max places to scrape per search query (1 to 500) | `20` |
| `deepWebsiteEnrichment` | Boolean | Whether to visit websites for deep email and socials extraction | `true` |
| `extractEmails` | Boolean | Enable/disable email extraction | `true` |
| `extractSocials` | Boolean | Enable/disable social profiles extraction | `true` |
| `extractPhones` | Boolean | Enable/disable phone numbers extraction | `true` |

### Example Input:
```json
{
  "searchQueries": [
    "Software houses in Warsaw",
    "Creative agencies in Berlin"
  ],
  "maxPlacesPerQuery": 25,
  "deepWebsiteEnrichment": true,
  "extractEmails": true,
  "extractSocials": true,
  "extractPhones": true
}
```

---

## 📤 Output Sample

For each business, you receive a rich, actionable record in the Apify Dataset:

```json
{
  "query": "Software houses in Warsaw",
  "title": "Software House Sp. z o.o.",
  "category": "Software company",
  "rating": 4.9,
  "reviewsCount": 68,
  "address": "ul. Prosta 20, 00-850 Warszawa, Poland",
  "phone": "+48 22 123 4567",
  "website": "https://example-software.pl",
  "googleMapsUrl": "https://www.google.com/maps/place/...",
  "latitude": 52.2301,
  "longitude": 20.9904,
  "emails": [
    "kontakt@example-software.pl",
    "hello@example-software.pl"
  ],
  "phones": [
    "+48 22 123 4567",
    "+48 500 123 456"
  ],
  "socials": {
    "linkedin": "https://linkedin.com/company/example-software",
    "instagram": "https://instagram.com/example_software",
    "facebook": "https://facebook.com/examplesoftware",
    "twitter": null,
    "youtube": null,
    "tiktok": null
  },
  "enriched": true,
  "scrapedAt": "2026-09-17T13:40:00.000Z"
}
```

---

## 💼 High-Yield Use Cases

1. **Cold Email & SDR Outreach**: Build hyper-targeted B2B lead lists with verified direct emails in minutes.
2. **Local Business Web Agencies**: Find businesses in your region that lack a modern web presence or direct contact channels.
3. **Influencer & PR Outreach**: Collect verified social profiles of local brands and creators.
4. **CRM Data Cleansing**: Bulk-upload your current list of company domains to populate missing emails and phone numbers.
