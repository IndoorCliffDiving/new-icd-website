/**
 * Single source of truth for everything search engines and AI agents read about
 * Indoor Cliff Diving: NAP data, offers, FAQ content and per-language page meta.
 *
 * `script.js` consumes this to generate the JSON-LD graph, the visible FAQ block,
 * `sitemap.xml` and `llms.txt`. Facts live here once so the Dutch and English
 * pages can never drift apart or contradict the structured data.
 *
 * Every value below must stay a true representation of what the page actually
 * says — Google and AI answer engines both penalise structured data that
 * describes things the visible page doesn't.
 */

const SITE_URL = 'https://www.indoorcliffdiving.com';

/** Absolute URL helper — structured data and social tags must never use relative paths. */
const abs = (p) => `${SITE_URL}${p.startsWith('/') ? p : `/${p}`}`;

const PAGES = {
    nl: { path: '/', lang: 'nl', locale: 'nl_NL', hreflang: 'nl-NL' },
    en: { path: '/en.html', lang: 'en', locale: 'en_GB', hreflang: 'en' },
};

const BUSINESS = {
    name: 'Indoor Cliff Diving',
    legalName: 'Indoor Cliff Diving',
    foundingDate: '2017',
    email: 'indoorcliffdiving@gmail.com',
    telephone: '+31627126225',
    telephoneDisplay: '06-27 12 62 25',
    address: {
        venue: 'Optisport Sloterparkbad',
        street: 'President Allendelaan 3',
        postalCode: '1064 GW',
        city: 'Amsterdam',
        region: 'Noord-Holland',
        country: 'NL',
    },
    geo: { latitude: 52.3697, longitude: 4.8178 },
    logo: abs('/img/icon.png'),
    image: abs('/img/thumbnail_2.jpg'),
    imageWidth: 1067,
    imageHeight: 600,
    bookingUrl: 'https://indoorcliffdiving.trainin.app/company/schedule',
    shopUrl: 'https://indoorcliffdiving.trainin.app/company/shop',
    scheduleUrl: 'https://indoorcliffdiving.trainin.app/schedule',
    sameAs: [
        'https://www.facebook.com/indoorcliffdiving/',
        'https://www.instagram.com/indoorcliffdiving/',
        'https://indoorcliffdiving.trainin.app/',
    ],
    /**
     * Sessions at the club's own address (Sloterparkbad) only. The Turnz sessions
     * listed on the page happen at a partner gym, so they are deliberately not
     * part of this venue's opening hours.
     */
    openingHours: [
        { days: ['Thursday'], opens: '21:00', closes: '22:00' },
        { days: ['Sunday'], opens: '14:30', closes: '17:30' },
    ],
    priceRange: '€8–€60',
};

/** Mirrors the visible pricing cards. `price` is numeric so it validates as an Offer. */
const OFFERS = [
    { id: 'trial-lesson', price: 15, nl: { name: 'Proefles', description: '1x entree voor een proefles' }, en: { name: 'Trial Lesson', description: 'Single entry trial lesson' }, url: BUSINESS.shopUrl },
    { id: 'youth-ticket', price: 8, nl: { name: 'Jongeren ticket', description: '1x entree voor jongeren' }, en: { name: 'Youth Ticket', description: 'Single entry for youth members' }, url: BUSINESS.shopUrl },
    { id: 'trial-package', price: 50, nl: { name: 'Proefpakket', description: '5x entree' }, en: { name: 'Trial Package', description: '5 entries' }, url: BUSINESS.shopUrl },
    { id: 'monthly', price: 50, nl: { name: 'Maandabonnement', description: 'Onbeperkte toegang voor een maand' }, en: { name: 'Monthly Subscription', description: 'Unlimited access for one month' }, url: BUSINESS.shopUrl },
    { id: 'season', price: 400, nl: { name: 'Seizoenskaart', description: 'Onbeperkte toegang voor een seizoen' }, en: { name: 'Season Ticket', description: 'Unlimited access for a full season' }, url: `mailto:${BUSINESS.email}` },
    { id: 'private-trainer', price: 60, nl: { name: 'Privétrainer', description: 'Privétrainer gedurende reguliere trainingsuren' }, en: { name: 'Private Trainer', description: 'Private trainer during regular training hours' }, url: `mailto:${BUSINESS.email}` },
    { id: 'private-booking', price: 410, nl: { name: 'Privéboeking', description: 'Exclusieve toegang tot het hele zwembad met trainer, per uur' }, en: { name: 'Private Booking', description: 'Exclusive access to the entire pool with a trainer, per hour' }, url: `mailto:${BUSINESS.email}` },
];

/** Mirrors the visible "Wat we bieden" / "What we offer" cards. */
const SERVICES = {
    nl: [
        { name: 'Trainingen', description: 'Skill Classes en Open Trainingen voor beginners, intermediates en pro\'s op donderdag en zondag.' },
        { name: 'Wedstrijden', description: 'Competities in X-Diving, High Diving en bommetjes, plus begeleiding naar nationale en internationale toernooien.' },
        { name: 'Trips', description: 'Cliff dive vakanties en trainingskampen door Europa onder begeleiding van ervaren cliff divers.' },
        { name: 'Privéboekingen', description: 'Bedrijfsuitjes, kinderfeestjes, clinics, vrijgezellenfeesten en anti-hoogtevreeslessen met exclusieve toegang tot het zwembad.' },
    ],
    en: [
        { name: 'Training sessions', description: 'Skill Classes and Open Trainings for beginners, intermediates and pros on Thursdays and Sundays.' },
        { name: 'Competitions', description: 'X-Diving, High Diving and bomb contests, plus coaching towards national and international tournaments.' },
        { name: 'Trips', description: 'Cliff diving holidays and training camps across Europe guided by experienced cliff divers.' },
        { name: 'Private bookings', description: 'Company outings, kids parties, clinics, stag parties and fear-of-heights lessons with exclusive access to the pool.' },
    ],
};

/**
 * FAQ content. Rendered as visible HTML *and* as FAQPage JSON-LD from the same
 * strings — Google requires the markup to match what a visitor can read.
 * Answers open with a direct 40–60 word statement, which is the shape answer
 * engines extract and cite.
 */
const FAQ = {
    nl: [
        {
            q: 'Wat is Indoor Cliff Diving?',
            a: 'Indoor Cliff Diving is een sportclub in Amsterdam waar je leert springen en duiken van hoogtes tussen 0 en 10 meter in het torenbad van het Sloterparkbad. De club combineert cliff diving, high diving, X-diving en freestyle schoonspringen in trainingen voor alle niveaus, van absolute beginner tot wedstrijdspringer.',
        },
        {
            q: 'Waar traint Indoor Cliff Diving?',
            a: 'De trainingen vinden plaats in Optisport Sloterparkbad, President Allendelaan 3, 1064 GW Amsterdam. Daarnaast zijn er open trainingen in turnhal Turnz in Amsterdam, waar leden op trampolines en in de schuimbak sprongen oefenen voordat ze die in het water uitvoeren.',
        },
        {
            q: 'Wat zijn de trainingstijden?',
            a: 'In het Sloterparkbad wordt getraind op donderdag van 21.00 tot 22.00 uur en op zondag van 14.30 tot 15.30 uur (Kids Skill Class) en 15.30 tot 17.30 uur. Bij Turnz zijn er open trainingen op dinsdag 20.30–22.30, vrijdag 19.30–21.00 en zondag 18.00–21.00 uur.',
        },
        {
            q: 'Heb ik ervaring nodig om mee te doen?',
            a: 'Nee, ervaring is niet nodig. Je stapt in op je eigen niveau en begint zo laag als je zelf wilt. Tijdens een Skill Class begeleidt een trainer je stap voor stap bij het aanleren van duikvaardigheden. Er zijn aparte Skill Classes voor beginners, intermediates en pro\'s.',
        },
        {
            q: 'Wat is het verschil tussen een Skill Class en een Open Training?',
            a: 'Bij een Skill Class leidt een trainer de les en leer je gericht nieuwe duikvaardigheden; het niveau staat in de titel van de les. Bij een Open Training spring je vrij en bepaal je zelf waar je aan werkt. Er is altijd een trainer aanwezig voor vragen en tips, maar enige zelfstandigheid is vereist.',
        },
        {
            q: 'Wat kost een training bij Indoor Cliff Diving?',
            a: 'Een proefles kost €15 en een jongerenticket €8. Een proefpakket van 5 entrees kost €50, een maandabonnement met onbeperkte toegang €50 en een seizoenskaart €400. Een privétrainer tijdens reguliere trainingsuren kost €60.',
        },
        {
            q: 'Kunnen kinderen meedoen?',
            a: 'Ja. Op zondag van 14.30 tot 15.30 uur is er een Kids Skill Class waarin kinderen onder begeleiding van een trainer leren springen en duiken. Voor jongeren geldt een aangepast tarief van €8 per entree.',
        },
        {
            q: 'Hoe meld ik me aan voor een training?',
            a: `Je reserveert je plek online via het boekingssysteem op ${BUSINESS.bookingUrl}. Daar zie je het actuele rooster en koop je losse entrees, pakketten of abonnementen. Vragen kun je stellen via ${BUSINESS.email} of telefonisch op ${BUSINESS.telephoneDisplay}.`,
        },
        {
            q: 'Kan ik het zwembad privé afhuren voor een groep?',
            a: `Ja. Een privéboeking geeft exclusieve toegang tot het hele zwembad met een trainer, op een moment dat het jou uitkomt, voor €410 per uur. Dit is geschikt voor bedrijfsuitjes, kinderfeestjes, clinics, vrijgezellenfeesten en schoolactiviteiten. Boeken kan via ${BUSINESS.email}.`,
        },
    ],
    en: [
        {
            q: 'What is Indoor Cliff Diving?',
            a: 'Indoor Cliff Diving is a sports club in Amsterdam where you learn to jump and dive from heights between 0 and 10 metres in the diving tower pool at Sloterparkbad. The club combines cliff diving, high diving, X-diving and freestyle diving in training sessions for every level, from complete beginner to competitive diver.',
        },
        {
            q: 'Where does Indoor Cliff Diving train?',
            a: 'Training takes place at Optisport Sloterparkbad, President Allendelaan 3, 1064 GW Amsterdam, the Netherlands. The club also runs open training sessions at the Turnz gymnastics hall in Amsterdam, where members practise jumps on trampolines and into the foam pit before taking them to the water.',
        },
        {
            q: 'What are the training times?',
            a: 'At Sloterparkbad the club trains on Thursday from 21.00 to 22.00 and on Sunday from 14.30 to 15.30 (Kids Skill Class) and 15.30 to 17.30. At Turnz there are open training sessions on Tuesday 20.30–22.30, Friday 19.30–21.00 and Sunday 18.00–21.00.',
        },
        {
            q: 'Do I need experience to join?',
            a: 'No experience is required. You start at your own level and jump from whatever height you are comfortable with. During a Skill Class a trainer guides you step by step through new diving skills. Separate Skill Classes run for beginners, intermediates and pros.',
        },
        {
            q: 'What is the difference between a Skill Class and an Open Training?',
            a: 'In a Skill Class a trainer leads the session and teaches specific diving skills; the level is stated in the class title. In an Open Training you jump freely and decide what to work on yourself. A trainer is always present for questions and tips, but some independence is expected.',
        },
        {
            q: 'What does training at Indoor Cliff Diving cost?',
            a: 'A trial lesson costs €15 and a youth ticket €8. A trial package of 5 entries costs €50, a monthly subscription with unlimited access €50, and a season ticket €400. A private trainer during regular training hours costs €60.',
        },
        {
            q: 'Can children join?',
            a: 'Yes. There is a Kids Skill Class every Sunday from 14.30 to 15.30 where children learn to jump and dive under a trainer\'s supervision. Youth members pay a reduced rate of €8 per entry.',
        },
        {
            q: 'How do I sign up for a training session?',
            a: `You book your spot online through the booking system at ${BUSINESS.bookingUrl}, which shows the live schedule and sells single entries, packages and subscriptions. For questions, email ${BUSINESS.email} or call ${BUSINESS.telephoneDisplay}.`,
        },
        {
            q: 'Can I book the pool privately for a group?',
            a: `Yes. A private booking gives exclusive access to the entire pool with a trainer, scheduled at your convenience, for €410 per hour. It suits company outings, kids parties, clinics, stag parties and school activities. Book by emailing ${BUSINESS.email}.`,
        },
    ],
};

/** Per-language `<head>` content and the FAQ section heading. */
const META = {
    nl: {
        title: 'Indoor Cliff Diving Amsterdam | Leer springen van 0 tot 10 meter',
        description: 'Sportclub voor cliff diving, high diving, X-diving en freestyle schoonspringen in het Sloterparkbad Amsterdam. Skill Classes en open trainingen voor alle niveaus, vanaf €15.',
        faqHeading: 'Veelgestelde vragen',
        summary: 'Indoor Cliff Diving is een sportclub in Amsterdam die cliff diving, high diving, X-diving en freestyle schoonspringen aanbiedt in het torenbad van het Sloterparkbad, met trainingen voor alle niveaus van 0 tot 10 meter.',
    },
    en: {
        title: 'Indoor Cliff Diving Amsterdam | Learn to Dive from 0 to 10 Metres',
        description: 'Cliff diving, high diving, X-diving and freestyle diving club at Sloterparkbad in Amsterdam. Skill Classes and open training for every level, from €15 a session.',
        faqHeading: 'Frequently asked questions',
        summary: 'Indoor Cliff Diving is a sports club in Amsterdam offering cliff diving, high diving, X-diving and freestyle diving in the diving tower pool at Sloterparkbad, with training for all levels from 0 to 10 metres.',
    },
};

module.exports = { SITE_URL, abs, PAGES, BUSINESS, OFFERS, SERVICES, FAQ, META };
