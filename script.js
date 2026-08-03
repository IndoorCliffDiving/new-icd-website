const axios = require('axios');
const csv = require('csv-parser');
const minify = require('html-minifier').minify;
const { writeFileSync, readFileSync } = require('fs');
const path = require('path');
const { Readable } = require('stream');

const { SITE_URL, abs, PAGES, BUSINESS, OFFERS, SERVICES, FAQ, META } = require('./seo-data');

const csvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT8wne1qGkFE0m-4QwHXPkRo_Tx4FHbsE8Fw7fMD-MCc_wKTVlKL6XkcB5-pifBW3o-wWKEOxCIIsAE/pub?gid=0&single=true&output=csv';
const outputDir = path.resolve(__dirname, 'output');

const TARGETS = [
    { lang: 'nl', template: path.resolve(__dirname, 'template.html'), output: path.resolve(outputDir, 'index.html') },
    { lang: 'en', template: path.resolve(__dirname, 'template-en.html'), output: path.resolve(outputDir, 'en.html') },
];

const AGENDA_HEADINGS = {
    nl: { date: 'Datum', event: 'Event', location: 'Locatie', caption: 'Wedstrijden, trips en evenementen van Indoor Cliff Diving' },
    en: { date: 'Date', event: 'Event', location: 'Location', caption: 'Indoor Cliff Diving competitions, trips and events' },
};

const escapeHtml = (value) => String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/* ------------------------------------------------------------------ *
 * Event date parsing
 * ------------------------------------------------------------------ */

const DUTCH_MONTHS = {
    januari: 0, februari: 1, maart: 2, april: 3, mei: 4, juni: 5,
    juli: 6, augustus: 7, september: 8, oktober: 9, november: 10, december: 11,
};

const iso = (date) => date.toISOString().slice(0, 10);

/**
 * The agenda sheet stores dates as free-form Dutch text without a year
 * ("19 t/m 21 december", "28 juni", "juli / augustus", "???"). Schema.org
 * events require a real ISO `startDate`, so an Event is only emitted when the
 * text yields an unambiguous day and month — everything else is skipped rather
 * than guessed at.
 *
 * The year is inferred as the next occurrence, since the sheet is a rolling
 * season calendar: a month that has already passed belongs to the next year.
 * Adding a `Year` column to the sheet overrides the inference.
 */
function parseEventDate(raw, yearOverride, today = new Date()) {
    const text = String(raw).toLowerCase().trim();
    const monthNames = Object.keys(DUTCH_MONTHS).join('|');

    const range = text.match(new RegExp(`^(\\d{1,2})\\s*(?:t/m|tot en met|tot|-|–|—)\\s*(\\d{1,2})\\s+(${monthNames})$`));
    const single = text.match(new RegExp(`^(\\d{1,2})\\s+(${monthNames})$`));
    if (!range && !single) return null;

    const startDay = Number(range ? range[1] : single[1]);
    const endDay = range ? Number(range[2]) : startDay;
    const month = DUTCH_MONTHS[range ? range[3] : single[2]];
    if (endDay < startDay) return null;

    let year = Number(yearOverride) || today.getUTCFullYear();
    if (!yearOverride) {
        // Roll forward once the event's last day is more than a week behind us.
        const grace = new Date(Date.UTC(year, month, endDay + 7));
        if (grace < today) year += 1;
    }

    const start = new Date(Date.UTC(year, month, startDay));
    const end = new Date(Date.UTC(year, month, endDay));
    // Rejects impossible days like "31 februari", which JS would silently roll over.
    if (Number.isNaN(start.getTime()) || start.getUTCMonth() !== month || end.getUTCMonth() !== month) return null;

    return { startDate: iso(start), endDate: iso(end) };
}

/* ------------------------------------------------------------------ *
 * HTML fragments
 * ------------------------------------------------------------------ */

function buildAgendaTable(rows, lang) {
    const h = AGENDA_HEADINGS[lang];
    const body = rows.map((row) => `
        <tr>
          <td>${escapeHtml(row.Date)}</td>
          <td>${escapeHtml(row.Event)}</td>
          <td>${escapeHtml(row.Location)}</td>
        </tr>`).join('');

    return `
    <table class="table agenda">
      <caption class="sr-only">${escapeHtml(h.caption)}</caption>
      <thead>
        <tr>
          <th scope="col">${h.date}</th>
          <th scope="col">${h.event}</th>
          <th scope="col">${h.location}</th>
        </tr>
      </thead>
      <tbody>${body}
      </tbody>
    </table>
  `;
}

/**
 * Renders the FAQ from the same strings used for the FAQPage JSON-LD, so the
 * markup can never describe answers a visitor cannot actually read.
 */
function buildFaqSection(lang) {
    const items = FAQ[lang].map((item) => `
                    <div class="col-md-10 col-md-offset-1">
                        <details class="faq-item">
                            <summary><h3>${escapeHtml(item.q)}</h3></summary>
                            <p>${escapeHtml(item.a)}</p>
                        </details>
                    </div>`).join('');

    return `
        <section id="faq" class="section md-padding bg-grey" aria-labelledby="faq-heading">
            <div class="container">
                <div class="row">
                    <div class="section-header text-center">
                        <h2 id="faq-heading" class="title">${escapeHtml(META[lang].faqHeading)}</h2>
                    </div>${items}
                </div>
            </div>
        </section>`;
}

/* ------------------------------------------------------------------ *
 * Structured data
 * ------------------------------------------------------------------ */

const ORG_ID = `${SITE_URL}/#organization`;
const VENUE_ID = `${SITE_URL}/#venue`;

function postalAddress() {
    return {
        '@type': 'PostalAddress',
        streetAddress: BUSINESS.address.street,
        addressLocality: BUSINESS.address.city,
        addressRegion: BUSINESS.address.region,
        postalCode: BUSINESS.address.postalCode,
        addressCountry: BUSINESS.address.country,
    };
}

function organizationNode(lang) {
    return {
        '@type': ['SportsClub', 'SportsActivityLocation'],
        '@id': ORG_ID,
        name: BUSINESS.name,
        legalName: BUSINESS.legalName,
        description: META[lang].summary,
        url: `${SITE_URL}/`,
        logo: { '@type': 'ImageObject', url: BUSINESS.logo, width: 512, height: 512 },
        image: BUSINESS.image,
        email: BUSINESS.email,
        telephone: BUSINESS.telephone,
        foundingDate: BUSINESS.foundingDate,
        priceRange: BUSINESS.priceRange,
        currenciesAccepted: 'EUR',
        sport: ['Cliff diving', 'High diving', 'Diving', 'Freestyle diving'],
        knowsAbout: ['Cliff diving', 'High diving', 'X-Diving', 'Freestyle diving', 'Death diving', 'Platform diving'],
        address: postalAddress(),
        geo: { '@type': 'GeoCoordinates', latitude: BUSINESS.geo.latitude, longitude: BUSINESS.geo.longitude },
        areaServed: { '@type': 'City', name: 'Amsterdam' },
        containedInPlace: { '@id': VENUE_ID },
        sameAs: BUSINESS.sameAs,
        openingHoursSpecification: BUSINESS.openingHours.map((slot) => ({
            '@type': 'OpeningHoursSpecification',
            dayOfWeek: slot.days.map((day) => `https://schema.org/${day}`),
            opens: slot.opens,
            closes: slot.closes,
        })),
        potentialAction: {
            '@type': 'ReserveAction',
            name: lang === 'nl' ? 'Meld je aan voor een training' : 'Book a training session',
            target: {
                '@type': 'EntryPoint',
                urlTemplate: BUSINESS.bookingUrl,
                actionPlatform: [
                    'https://schema.org/DesktopWebPlatform',
                    'https://schema.org/MobileWebPlatform',
                ],
            },
            result: { '@type': 'Reservation', name: lang === 'nl' ? 'Trainingsreservering' : 'Training reservation' },
        },
        makesOffer: SERVICES[lang].map((service) => ({
            '@type': 'Offer',
            itemOffered: { '@type': 'Service', name: service.name, description: service.description },
        })),
        hasOfferCatalog: {
            '@type': 'OfferCatalog',
            name: lang === 'nl' ? 'Tickets en abonnementen' : 'Tickets and memberships',
            itemListElement: OFFERS.map((offer) => ({
                '@type': 'Offer',
                name: offer[lang].name,
                description: offer[lang].description,
                price: offer.price,
                priceCurrency: 'EUR',
                url: offer.url,
                availability: 'https://schema.org/InStock',
            })),
        },
    };
}

function venueNode() {
    return {
        '@type': ['PublicSwimmingPool', 'Place'],
        '@id': VENUE_ID,
        name: BUSINESS.address.venue,
        address: postalAddress(),
        geo: { '@type': 'GeoCoordinates', latitude: BUSINESS.geo.latitude, longitude: BUSINESS.geo.longitude },
    };
}

function eventNodes(rows, lang) {
    const agendaUrl = `${abs(PAGES[lang].path)}#agenda`;

    return rows.reduce((events, row) => {
        const dates = parseEventDate(row.Date, row.Year);
        if (!dates) return events;

        events.push({
            '@type': 'SportsEvent',
            '@id': `${SITE_URL}/#event-${events.length + 1}`,
            name: row.Event,
            startDate: dates.startDate,
            endDate: dates.endDate,
            eventStatus: 'https://schema.org/EventScheduled',
            eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
            url: agendaUrl,
            organizer: { '@id': ORG_ID },
            location: /sloterparkbad/i.test(row.Location)
                ? { '@id': VENUE_ID }
                : { '@type': 'Place', name: row.Location },
        });
        return events;
    }, []);
}

function buildStructuredData(rows, lang) {
    const page = PAGES[lang];
    const pageUrl = abs(page.path);
    const alternate = lang === 'nl' ? PAGES.en : PAGES.nl;

    const graph = [
        organizationNode(lang),
        venueNode(),
        {
            '@type': 'WebSite',
            '@id': `${SITE_URL}/#website`,
            url: `${SITE_URL}/`,
            name: BUSINESS.name,
            description: META[lang].description,
            publisher: { '@id': ORG_ID },
            inLanguage: page.hreflang,
        },
        {
            '@type': ['WebPage', 'FAQPage'],
            '@id': `${pageUrl}#webpage`,
            url: pageUrl,
            name: META[lang].title,
            description: META[lang].description,
            isPartOf: { '@id': `${SITE_URL}/#website` },
            about: { '@id': ORG_ID },
            primaryImageOfPage: { '@type': 'ImageObject', url: BUSINESS.image },
            inLanguage: page.hreflang,
            dateModified: iso(new Date()),
            mainEntity: FAQ[lang].map((item) => ({
                '@type': 'Question',
                name: item.q,
                acceptedAnswer: { '@type': 'Answer', text: item.a },
            })),
            translationOfWork: { '@id': `${abs(alternate.path)}#webpage` },
        },
        ...eventNodes(rows, lang),
    ];

    const json = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph });
    return `<script type="application/ld+json">${json}</script>`;
}

/* ------------------------------------------------------------------ *
 * Crawler-facing files
 * ------------------------------------------------------------------ */

function buildSitemap() {
    const lastmod = iso(new Date());
    const alternates = Object.values(PAGES)
        .map((page) => `        <xhtml:link rel="alternate" hreflang="${page.hreflang}" href="${abs(page.path)}"/>`)
        .join('\n');

    const urls = Object.values(PAGES).map((page) => `    <url>
        <loc>${abs(page.path)}</loc>
        <lastmod>${lastmod}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>${page.path === '/' ? '1.0' : '0.9'}</priority>
${alternates}
        <xhtml:link rel="alternate" hreflang="x-default" href="${SITE_URL}/"/>
    </url>`).join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls}
</urlset>
`;
}

/** llms.txt — the short index an agent reads first (llmstxt.org format). */
function buildLlmsTxt() {
    return `# ${BUSINESS.name}

> ${META.en.summary} Training runs year-round at Sloterparkbad in Amsterdam Nieuw-West, with Skill Classes led by a trainer and Open Trainings for independent practice. Sessions start at €15 and no prior experience is required.

Indoor Cliff Diving is a sports club, not a shop. The live class schedule, reservations and ticket sales are all handled by an external system at ${BUSINESS.bookingUrl}. The website itself is a single informational page published in Dutch and English.

- Address: ${BUSINESS.address.venue}, ${BUSINESS.address.street}, ${BUSINESS.address.postalCode} ${BUSINESS.address.city}, Netherlands
- Coordinates: ${BUSINESS.geo.latitude}, ${BUSINESS.geo.longitude}
- Email: ${BUSINESS.email}
- Phone: ${BUSINESS.telephone}
- Founded: ${BUSINESS.foundingDate}

## Pages

- [Indoor Cliff Diving (Dutch)](${SITE_URL}/): Full site in Dutch — training times, services, event calendar, prices, team, contact details and FAQ.
- [Indoor Cliff Diving (English)](${abs(PAGES.en.path)}): The same content in English.
- [Full site content as text](${SITE_URL}/llms-full.txt): Every fact on the site — schedule, prices, services, FAQ and the current event calendar — as plain text.

## Booking and schedule

- [Book a session](${BUSINESS.bookingUrl}): Live class schedule and reservations.
- [Buy tickets and memberships](${BUSINESS.shopUrl}): Single entries, packages, monthly and season passes.
- [Class timetable](${BUSINESS.scheduleUrl}): Skill Classes and Open Trainings.

## Optional

- [Facebook](https://www.facebook.com/indoorcliffdiving/): Announcements and photos.
- [Instagram](https://www.instagram.com/indoorcliffdiving/): Photos and video from training and competitions.
- [Liability waiver (PDF, Dutch)](${SITE_URL}/docs/Eigen%20risico%20verklaring%20ICD.pdf): Own-risk declaration signed by participants.
`;
}

/** llms-full.txt — the whole site as plain text, so an agent needs a single fetch. */
function buildLlmsFullTxt(rows) {
    const offers = OFFERS.map((offer) => `- ${offer.en.name}: €${offer.price} — ${offer.en.description}`).join('\n');
    const services = SERVICES.en.map((service) => `- ${service.name}: ${service.description}`).join('\n');
    const faq = FAQ.en.map((item) => `### ${item.q}\n\n${item.a}`).join('\n\n');
    const events = rows.length
        ? rows.map((row) => `- ${row.Date} — ${row.Event} (${row.Location})`).join('\n')
        : '- No events are currently listed.';

    return `# ${BUSINESS.name} — full site content

> ${META.en.summary}

Last generated: ${iso(new Date())}
Canonical pages: ${SITE_URL}/ (Dutch) and ${abs(PAGES.en.path)} (English)

## Contact and location

- Venue: ${BUSINESS.address.venue}
- Address: ${BUSINESS.address.street}, ${BUSINESS.address.postalCode} ${BUSINESS.address.city}, ${BUSINESS.address.region}, Netherlands
- Coordinates: ${BUSINESS.geo.latitude}, ${BUSINESS.geo.longitude}
- Email: ${BUSINESS.email}
- Phone: ${BUSINESS.telephone} (${BUSINESS.telephoneDisplay})
- Social profiles: ${BUSINESS.sameAs.join(', ')}

## Training times

At Sloterparkbad (${BUSINESS.address.street}, ${BUSINESS.address.city}):
- Thursday 21.00–22.00 — Skill Class and Open Training
- Sunday 14.30–15.30 — Kids Skill Class
- Sunday 15.30–17.30 — Skill Class and Open Training

At the Turnz gymnastics hall, Amsterdam:
- Tuesday 20.30–22.30 — Open Training
- Friday 19.30–21.00 — Open Training
- Sunday 18.00–21.00 — Open Training

## What the club offers

${services}

## Prices

${offers}

Tickets and memberships are bought at ${BUSINESS.shopUrl}. Season tickets, private trainers and private bookings are arranged by emailing ${BUSINESS.email}.

## Event calendar

${events}

## Frequently asked questions

${faq}
`;
}

/* ------------------------------------------------------------------ *
 * Build
 * ------------------------------------------------------------------ */

function readCsvRows(csvText) {
    return new Promise((resolve, reject) => {
        const rows = [];
        Readable.from([csvText])
            .pipe(csv())
            .on('data', (row) => {
                // Filter out rows with any empty values
                if (row.Date && row.Event && row.Location) rows.push(row);
            })
            .on('end', () => resolve(rows))
            .on('error', reject);
    });
}

function generateHTML(rows, { lang, template, output }) {
    const templateContent = readFileSync(template, 'utf8')
        .replace('<!-- ICD_EVENT_TABLE_CONTENT -->', buildAgendaTable(rows, lang))
        .replace('<!-- ICD_FAQ_CONTENT -->', buildFaqSection(lang))
        .replace('<!-- ICD_STRUCTURED_DATA -->', buildStructuredData(rows, lang));

    writeFileSync(output, minify(templateContent, {
        collapseWhitespace: true,
        conservativeCollapse: true,
        removeComments: true,
        minifyCSS: true,
        minifyJS: true,
    }));
    console.log(`Built ${output}`);
}

(async () => {
    try {
        const response = await axios.get(csvUrl, { responseType: 'text' });
        const rows = await readCsvRows(response.data);

        TARGETS.forEach((target) => generateHTML(rows, target));

        writeFileSync(path.resolve(outputDir, 'sitemap.xml'), buildSitemap());
        writeFileSync(path.resolve(outputDir, 'llms.txt'), buildLlmsTxt());
        writeFileSync(path.resolve(outputDir, 'llms-full.txt'), buildLlmsFullTxt(rows));
        console.log(`Built sitemap.xml, llms.txt and llms-full.txt (${rows.length} agenda rows)`);
    } catch (error) {
        console.error('Error downloading or processing the CSV file:', error);
        process.exitCode = 1;
    }
})();
