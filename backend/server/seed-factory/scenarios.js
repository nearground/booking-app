import { createHash } from 'node:crypto';
import bcrypt from 'bcrypt';
import { Faker, en } from '@faker-js/faker';
import { CronExpressionParser } from 'cron-parser';
import { demoCatalog } from './catalog.js';
import { SEED_SCHEMA, validateSeedGraph } from './index.js';

const timezone = 'America/Mexico_City';
const hash = (value) => createHash('sha256').update(value).digest('hex');
export function scenarioSeedKey(scenario, seed = `pv-${scenario}-v1`) {
    if (!['startup', 'demo', 'showcase'].includes(scenario)) throw new Error('Scenario must be startup, demo, or showcase');
    if (typeof seed !== 'string' || !seed.trim()) throw new Error('An explicit seed is required');
    return hash(`${scenario}:${seed}`).slice(0, 32);
}
const brands = [
    { primaryColor: '#0f766e', accentColor: '#f59e0b', font: 'inter', layoutTemplate: 'classic', tagline: 'Explore the coast, one adventure at a time' },
    { primaryColor: '#7c3aed', accentColor: '#f97316', font: 'lato', layoutTemplate: 'editorial', tagline: 'Local stories and new discoveries' },
    { primaryColor: '#1d4ed8', accentColor: '#eab308', font: 'montserrat', layoutTemplate: 'immersive', tagline: 'Make your next great memory here' },
];

export function generateScenario({ scenario, seed = `pv-${scenario}-v1`, clock, adminEmail, passwordHash } = {}) {
    if (!['startup', 'demo', 'showcase'].includes(scenario)) throw new Error('Scenario must be startup, demo, or showcase');
    if (typeof seed !== 'string' || !seed.trim()) throw new Error('An explicit seed is required');
    const now = new Date(clock);
    if (!Number.isFinite(now.getTime())) throw new Error('An explicit valid scenario clock is required');
    if (typeof passwordHash !== 'string' || !/^\$2[aby]\$\d\d\$/.test(passwordHash)) throw new Error('A bcrypt password hash is required');
    if (scenario === 'startup' && !adminEmail) throw new Error('Startup requires an explicit administrator email');
    if (scenario === 'showcase') return generateShowcaseScenario({ seed, now, passwordHash });
    const rng = new Faker({ locale: [en] });
    rng.seed(Number.parseInt(hash(seed).slice(0, 8), 16));
    const records = [];
    const links = [];
    const add = (type, key, attributes, refs = {}) => {
        records.push({ type, key, model: SEED_SCHEMA[type].model, attributes, refs });
        return key;
    };
    const organizationCount = scenario === 'startup' ? 1 : 3;
    for (let i = 0; i < organizationCount; i += 1) {
        const slug = scenario === 'startup' ? 'martinllc' : `testcompany${i + 1}`;
        add('organization', `org-${i}`, {
            name: scenario === 'startup' ? 'Martin LLC' : `Test Company ${i + 1}`,
            organizationUsername: slug, slug,
            email: `contact@${slug}.com`,
            ...brands[i],
            about: 'Discover the culture, flavors and coast of Puerto Vallarta with our welcoming local team.',
            logoMediaKey: null, coverMediaKey: null, coverMediaType: 'image',
            socialLinks: { website: `https://example.com/${slug}` },
            contactLinks: { email: `contact@${slug}.com`, website: `https://example.com/${slug}` },
        });
        links.push({ key: `org-${i}`, refs: { LocationId: `location-${i}` } });
    }
    const ownership = scenario === 'startup' ? [0] : [0, 1, 2, 0, 0, 1, 2];
    const demoLocations = [
        { name: 'Centro Puerto Vallarta Meeting Point', street: 'Morelos, Centro', coordinates: [-105.238, 20.610] },
        { name: 'Zona Romantica Meeting Point', street: 'Basilio Badillo, Emiliano Zapata', coordinates: [-105.2355, 20.6088] },
        { name: 'Marina Vallarta Meeting Point', street: 'Paseo de la Marina, Marina Vallarta', coordinates: [-105.250, 20.662] },
        { name: 'Sierra Ridge Trailhead', street: 'Paso Ancho, Puerto Vallarta', coordinates: [-105.202, 20.640] },
        { name: 'Centro Rooftop Mixology Studio', street: 'Morelos, Centro', coordinates: [-105.232, 20.612] },
        { name: 'Los Muertos Pier Meeting Point', street: 'Playa Los Muertos, Emiliano Zapata', coordinates: [-105.2393, 20.6006] },
        { name: 'Old Town Taco Route Meeting Point', street: 'Constitucion, Emiliano Zapata', coordinates: [-105.2364, 20.6085] },
    ];
    ownership.forEach((org, i) => {
        const demoLocation = demoLocations[i];
        const coordinates = scenario === 'startup'
            ? [-105.21986 + rng.number.float({ min: -0.006, max: 0.006 }), 20.64453 + rng.number.float({ min: -0.006, max: 0.006 })]
            : [
                demoLocation.coordinates[0] + rng.number.float({ min: -0.0004, max: 0.0004 }),
                demoLocation.coordinates[1] + rng.number.float({ min: -0.0004, max: 0.0004 }),
            ];
        add('location', `location-${i}`, {
            name: scenario === 'startup' ? 'Martin LLC HQ' : demoLocation.name,
            coordinates: { type: 'Point', coordinates },
            country: 'Mexico', state: 'Jalisco', city: 'Puerto Vallarta',
            street: scenario === 'startup' ? 'Flamingo 139' : demoLocation.street,
            zipCode: '48328', timezone,
        }, { OrganizationId: `org-${org}` });
    });
    const members = scenario === 'startup' ? 1 : 25;
    for (let i = 0; i < members; i += 1) {
        const isReset = i === 24;
        const username = scenario === 'startup' ? 'admin' : isReset ? 'reset-e2e' : `user${i + 1}`;
        add('members', `user-${i}`, {
            firstName: scenario === 'startup' ? 'Admin' : isReset ? 'Password' : rng.person.firstName(),
            lastName: scenario === 'startup' ? 'User' : isReset ? 'Reset' : 'Test',
            username,
            email: scenario === 'startup' ? adminEmail.trim().toLowerCase() : isReset ? 'reset-e2e@example.invalid' : `${username}@test.com`,
            password: passwordHash, phoneNumber: '1234567890',
            country: 'Mexico', city: 'Puerto Vallarta', isEmailVerified: true, isRegistered: true,
            profilePicture: scenario === 'startup' ? null : `/images/users/${i % 2 ? 'gal1' : 'guy1'}.webp`,
        });
        if (scenario === 'startup' || i < 22) {
            add('membership', `membership-${i}`, { isAdmin: i < organizationCount }, { UserId: `user-${i}`, OrganizationId: `org-${i % organizationCount}` });
            add('organizers', `organizer-${i}`, { description: 'Local organizer providing clear communication, welcoming check-in and reliable experience coordination.' }, { UserId: `user-${i}` });
        }
    }
    if (scenario === 'demo') {
        demoCatalog.forEach((entry, i) => {
            const { organization, location, cron, prices, ...attributes } = entry;
            add('experiences', `experience-${i}`, {
                ...attributes, autoSyncEnabled: false, scheduleLookaheadDays: 90,
                ratings: '4.00', commentsCount: 24,
                userQuestionnary: [{ questionKey: 'ready_to_have_fun', prompt: 'Ready to have fun???', required: false }],
            }, { OrganizationId: `org-${organization}`, LocationId: `location-${location}`, UserId: `user-${organization}` });
            const starts = [];
            if (cron) {
                add('schedules', `schedule-${i}`, {
                    name: `${entry.title} schedule`, ruleType: 'cron', ruleCron: cron,
                    timezone, durationMinutes: entry.duration, capacity: entry.capacity,
                    startDate: now.toISOString(), endDate: new Date(now.getTime() + 90 * 86400000).toISOString(),
                    active: true,
                }, { ExperienceId: `experience-${i}` });
                const iterator = CronExpressionParser.parse(cron, { currentDate: now, tz: timezone });
                const end = now.getTime() + 90 * 86400000;
                for (let date = iterator.next().toDate(); date.getTime() < end; date = iterator.next().toDate()) {
                    starts.push(date);
                }
            } else {
                for (const days of [7, 14, 21]) starts.push(new Date(now.getTime() + days * 86400000 + 16 * 3600000));
            }
            starts.forEach((date, n) => {
                const endDateTime = new Date(date.getTime() + entry.duration * 60000).toISOString();
                if (!cron) add('picks', `pick-${i}-${n}`, {
                    dateTime: date.toISOString(), endDateTime, capacity: entry.capacity, status: 'active', source: 'seed',
                }, { ExperienceId: `experience-${i}` });
                add(cron ? 'sessions' : 'pickedSessions', `session-${i}-${n}`, {
                    dateTime: date.toISOString(), endDateTime, capacity: entry.capacity,
                    availableSpots: entry.capacity, status: 'scheduled', syncLocked: true,
                }, { ExperienceId: `experience-${i}`, ...(cron ? { ScheduleTemplateId: `schedule-${i}` } : { PickedOccurrenceId: `pick-${i}-${n}` }) });
            });
            prices.forEach((price, tier) => add('ticketTiers', `tier-${i}-${tier}`, {
                title: ['Adult', 'Adult', 'Student', 'Child'][tier],
                description: tier === 0 ? 'Drinks included' : null,
                minAge: [18, 15, 15, 2][tier], maxAge: tier === 3 ? 15 : null,
                maxTickets: 10, idType: ['passport', null, 'student ID', null][tier],
                price: price.toFixed(2),
                userQuestionnary: tier === 0 ? [{ questionKey: 'confirm_18_plus', prompt: 'I confirm I am 18 years of age or older', required: true, type: 'boolean' }] : null,
            }, { ExperienceId: `experience-${i}` }));
            for (const member of [organization, organization + 3]) add('experienceOrganizers', `host-${i}-${member}`, {}, { ExperienceId: `experience-${i}`, UserId: `user-${member}` });
            for (let user = 0; user < 24; user += 1) {
                const pool = [entry.thumbnail, ...entry.images];
                add('comments', `review-${i}-${user}`, {
                    CommentableType: 'Experience', stars: 3 + user % 3,
                    title: `A memorable ${entry.title.toLowerCase()}`.slice(0, 75),
                    comment: `${rng.lorem.sentences(2)} The local guides were welcoming and explained the experience clearly.`,
                    anonymity: user % 3, ParentId: null, repliesCount: 0,
                    images: user % 3 ? [] : pool.slice(0, 3).map((imageUrl, n) => ({ imageUrl, accessibleText: `${entry.title} guest photo ${n + 1}` })),
                }, { CommentableId: `experience-${i}`, UserId: `user-${user}` });
            }
        });
        for (let host = 0; host < 22; host += 1) {
            for (let user = 0; user < 24; user += 1) {
                if (host === user) continue;
                add('organizerComments', `host-review-${host}-${user}`, {
                    CommentableType: 'Organizer', stars: 3 + user % 3,
                    title: 'Helpful local host',
                    comment: 'Clear instructions, friendly communication and thoughtful coordination made this a comfortable experience.',
                    anonymity: user % 3, images: [], ParentId: null, repliesCount: 0,
                }, { CommentableId: `organizer-${host}`, UserId: `user-${user}` });
            }
        }
    }
    const graph = { seed, seedKey: scenarioSeedKey(scenario, seed), scenario, version: 1, generatedAt: now.toISOString(), records, links };
    validateSeedGraph(graph);
    return graph;
}

function generateShowcaseScenario({ seed, now, passwordHash }) {
    const rng = new Faker({ locale: [en] });
    rng.seed(Number.parseInt(hash(seed).slice(0, 8), 16));
    const records = [];
    const links = [];
    const add = (type, key, attributes, refs = {}) => {
        records.push({ type, key, model: SEED_SCHEMA[type].model, attributes, refs });
        return key;
    };
    const organizations = [
        {
            key: 'showcase-org-house-party',
            slug: 'house-party',
            name: 'House Party',
            email: 'contact@house-party.example.invalid',
            primaryColor: '#7c3aed',
            accentColor: '#f97316',
            font: 'inter',
            layoutTemplate: 'classic',
            tagline: 'Private venues. Great company. Free entry.',
            about: 'We bring people together for special bar nights and parties at private venues around Puerto Vallarta. Reserve your free ticket and join us in person.',
            owner: 'showcase-user-party',
            location: 'showcase-location-party',
        },
        {
            key: 'showcase-org-food-tours',
            slug: 'food-tours',
            name: 'Food Tours',
            email: 'contact@food-tours.example.invalid',
            primaryColor: '#9a3412',
            accentColor: '#f59e0b',
            font: 'lato',
            layoutTemplate: 'editorial',
            tagline: 'Taste the neighborhood with local food lovers',
            about: 'For years, our local guides have introduced visitors to Puerto Vallarta through its neighborhood kitchens, family-run taquerias, and market stalls. We bring that experience to every small-group tour, sharing the stories and flavors that make each part of the city unique.',
            owner: 'showcase-user-food',
            location: 'showcase-location-food',
        },
        {
            key: 'showcase-org-default-tours',
            slug: 'default-tours',
            name: 'Default Tours',
            email: 'contact@default-tours.example.invalid',
            primaryColor: '#0f766e',
            accentColor: '#f59e0b',
            font: 'system',
            layoutTemplate: 'classic',
            tagline: 'Explore the coast, one adventure at a time',
            about: 'Join our local guides for relaxed coastal adventures and unforgettable days on the bay.',
            owner: 'showcase-user-default',
            location: 'showcase-location-default',
        },
    ];
    for (const organization of organizations) {
        add('organization', organization.key, {
            name: organization.name,
            organizationUsername: organization.slug.replaceAll('-', ''),
            slug: organization.slug,
            email: organization.email,
            primaryColor: organization.primaryColor,
            accentColor: organization.accentColor,
            font: organization.font,
            layoutTemplate: organization.layoutTemplate,
            tagline: organization.tagline,
            about: organization.about,
            logoMediaKey: null,
            coverMediaKey: null,
            coverMediaType: 'image',
            socialLinks: { website: `https://example.com/${organization.slug}` },
            contactLinks: { email: organization.email, website: `https://example.com/${organization.slug}` },
        });
        links.push({ key: organization.key, refs: { LocationId: organization.location } });
    }

    const locations = [
        { key: 'showcase-location-party', organization: 'showcase-org-house-party', name: 'House Party Rooftop', street: 'Basilio Badillo, Zona Romantica', coordinates: [-105.2355, 20.6088] },
        { key: 'showcase-location-party-bar', organization: 'showcase-org-house-party', name: 'House Party Bar', street: 'Lazaro Cardenas, Zona Romantica', coordinates: [-105.2332, 20.6104] },
        { key: 'showcase-location-food', organization: 'showcase-org-food-tours', name: 'Old Town Taco Route', street: 'Constitucion, Emiliano Zapata', coordinates: [-105.2364, 20.6085] },
        { key: 'showcase-location-default', organization: 'showcase-org-default-tours', name: 'Los Muertos Pier Meeting Point', street: 'Playa Los Muertos, Emiliano Zapata', coordinates: [-105.2393, 20.6006] },
        { key: 'showcase-location-food-pitillal', organization: 'showcase-org-food-tours', name: 'Pitillal Market Meeting Point', street: 'Benito Juarez, El Pitillal', coordinates: [-105.2194, 20.6671] },
    ];
    locations.forEach((location) => add('location', location.key, {
        name: location.name,
        coordinates: {
            type: 'Point',
            coordinates: [
                location.coordinates[0] + rng.number.float({ min: -0.0004, max: 0.0004 }),
                location.coordinates[1] + rng.number.float({ min: -0.0004, max: 0.0004 }),
            ],
        },
        country: 'Mexico',
        state: 'Jalisco',
        city: 'Puerto Vallarta',
        street: location.street,
        zipCode: '48328',
        timezone,
    }, { OrganizationId: location.organization }));

    const ownerProfiles = [
        { key: 'showcase-user-party', slug: 'party' },
        { key: 'showcase-user-food', slug: 'food' },
        { key: 'showcase-user-default', slug: 'default' },
    ];
    for (const [index, owner] of ownerProfiles.entries()) {
        add('members', owner.key, {
            firstName: ['Alex', 'Sam', 'Jordan'][index],
            lastName: 'Showcase',
            username: `showcase${owner.slug}`,
            email: `showcase-${owner.slug}-owner@example.invalid`,
            password: passwordHash,
            phoneNumber: '1234567890',
            country: 'Mexico',
            city: 'Puerto Vallarta',
            isEmailVerified: true,
            isRegistered: true,
            profilePicture: `/images/users/${index % 2 ? 'gal1' : 'guy1'}.webp`,
        });
        add('membership', `showcase-membership-${owner.slug}`, { isAdmin: true }, {
            UserId: owner.key,
            OrganizationId: `showcase-org-${owner.slug === 'party' ? 'house-party' : owner.slug === 'food' ? 'food-tours' : 'default-tours'}`,
        });
        add('organizers', `showcase-organizer-${owner.slug}`, {
            description: 'Local organizer providing welcoming check-in and reliable experience coordination.',
        }, { UserId: owner.key });
    }
    for (let index = 0; index < 3; index += 1) {
        add('members', `showcase-user-guest-${index}`, {
            firstName: ['Taylor', 'Morgan', 'Riley'][index],
            lastName: 'Guest',
            username: `showcaseguest${index + 1}`,
            email: `showcase-guest-${index + 1}@example.invalid`,
            password: passwordHash,
            phoneNumber: '1234567890',
            country: 'Mexico',
            city: 'Puerto Vallarta',
            isEmailVerified: true,
            isRegistered: true,
            profilePicture: `/images/users/${index % 2 ? 'gal1' : 'guy1'}.webp`,
        });
    }

    const eventQuestionnaire = [{
        questionKey: 'publicAttendance',
        prompt: 'I consent to show my registered name and profile picture on the public attendee list after my booking is confirmed. This is optional; only my own profile is shared.',
        required: false,
        type: 'boolean',
    }];
    const experiences = [
        {
            key: 'showcase-experience-party-0',
            organization: 'showcase-org-house-party',
            location: 'showcase-location-party',
            owner: 'showcase-user-party',
            title: 'Private Rooftop Party',
            subtitle: 'One special night, a private rooftop and free registration',
            description: 'Join our local party hosts for a relaxed night of music and conversation at a private rooftop venue. Reserve a free admission ticket, show it at the door, and meet other guests who opted into the public attendee list. Drinks are sold separately at the venue.',
            capacity: 14,
            duration: 150,
            thumbnail: null,
            images: [],
            userQuestionnary: eventQuestionnaire,
            template: 'event',
            copy: {
                storyHeading: 'A night above the bay',
                freeRegistrationHeading: 'Save your free place',
                attendanceHeading: 'Guests joining us',
            },
            locationKey: 'showcase-location-party',
        },
        {
            key: 'showcase-experience-party-1',
            organization: 'showcase-org-house-party',
            location: 'showcase-location-party-bar',
            owner: 'showcase-user-party',
            title: 'Bar Special Night',
            subtitle: 'Paid admission to a one-night neighborhood celebration',
            description: 'A special evening for friends old and new at one of our favorite private venues. Reserve your paid admission ticket for check-in, enjoy the music and order anything you like directly from the bar.',
            capacity: 12,
            duration: 120,
            thumbnail: null,
            images: [],
            userQuestionnary: eventQuestionnaire,
            template: 'event',
            copy: {
                storyHeading: 'An evening at the neighborhood bar',
                paidRegistrationHeading: 'Reserve your bar-night ticket',
                attendanceHeading: 'Guests joining us',
            },
            locationKey: 'showcase-location-party-bar',
        },
        {
            key: 'showcase-experience-food',
            organization: 'showcase-org-food-tours',
            location: 'showcase-location-food',
            owner: 'showcase-user-food',
            title: 'Old Town Taco Tour',
            subtitle: 'Street taco crawl through neighborhood favorites',
            description: 'Move through a handpicked lineup of neighborhood taquerias and street stands, sampling distinct styles that highlight preparation methods, regional sauces, and ingredient variations from stop to stop. Your host explains how each taco is built, why specific cuts and marinades are used, and how local preferences shape toppings, heat levels, and serving rhythm during peak hours.',
            capacity: 16,
            duration: 120,
            thumbnail: null,
            images: [],
            userQuestionnary: [{ questionKey: 'ready_to_have_fun', prompt: 'Ready to have fun???', required: false }],
            template: 'food-tour',
            copy: {
                heroEyebrow: 'A taste of old town Vallarta',
                galleryButton: 'See the taco route',
                bookingLabel: 'Choose a taco tour session',
                reviewsHeading: 'Stories from the table',
            },
            commentsDisabled: true,
            locationKey: 'showcase-location-food',
            cron: '0 9,13,17 * * 1,3,5',
            prices: [59.99, 44.99, 32.99, 17.99],
        },
        {
            key: 'showcase-experience-default',
            organization: 'showcase-org-default-tours',
            location: 'showcase-location-default',
            owner: 'showcase-user-default',
            title: 'Los Arcos Coastal Sightseeing Tour',
            subtitle: 'Scenic highlights and cultural landmarks in one route',
            description: 'Travel through signature waterfront landmarks, old-town streets, and elevated overlooks. Guided stops combine cultural context, architecture notes, and practical photo timing tips, with walking segments and short transfers through the bay.',
            capacity: 20,
            duration: 180,
            thumbnail: null,
            images: [],
            userQuestionnary: [{ questionKey: 'ready_to_have_fun', prompt: 'Ready to have fun???', required: false }],
            template: 'default',
            copy: {
                galleryLabel: 'Explore coastal tour photos',
                descriptionHeading: 'A day along the bay',
                pinnedReviewsHeading: 'Guest notes from the coast',
            },
            locationKey: 'showcase-location-default',
            cron: '0 9,13,17 * * 1,3,5',
            prices: [64.99, 49.99, 34.99, 19.99],
        },
        {
            key: 'showcase-experience-food-pitillal',
            organization: 'showcase-org-food-tours',
            location: 'showcase-location-food-pitillal',
            owner: 'showcase-user-food',
            title: 'Pitillal Food Tours',
            subtitle: 'A Friday-morning tasting walk through Pitillal',
            description: 'Explore Pitillal through its busy market, neighborhood kitchens, and family-run food stands. Meet local vendors, sample regional favorites, and hear how everyday ingredients and cooking traditions shape this lively part of Puerto Vallarta.',
            capacity: 12,
            duration: 150,
            thumbnail: null,
            images: [],
            userQuestionnary: [{ questionKey: 'ready_to_have_fun', prompt: 'Ready to have fun???', required: false }],
            template: 'food-tour',
            copy: {
                heroEyebrow: 'A taste of Pitillal',
                galleryButton: 'See the Pitillal route',
                bookingLabel: 'Choose a Pitillal tour session',
                reviewsHeading: 'Stories from the neighborhood',
            },
            locationKey: 'showcase-location-food-pitillal',
            cron: '0 9 * * 5',
            prices: [54.99, 42.99, 31.99, 17.99],
        },
    ];
    const eventStart = CronExpressionParser.parse('0 20 * * *', {
        currentDate: new Date(now.getTime() + 7 * 86400000),
        tz: timezone,
    }).next().toDate();
    const eventKeys = new Set(experiences.filter(({ template }) => template === 'event').map(({ key }) => key));
    for (const [index, experience] of experiences.entries()) {
        add('experiences', experience.key, {
            title: experience.title,
            subtitle: experience.subtitle,
            description: experience.description,
            capacity: experience.capacity,
            duration: experience.duration,
            thumbnail: experience.thumbnail,
            images: experience.images,
            userQuestionnary: experience.userQuestionnary,
            ratings: experience.template === 'food-tour' ? '5.00' : '4.50',
            commentsCount: 3,
            autoSyncEnabled: false,
            scheduleLookaheadDays: 90,
            detailsMetadata: {
                version: 1,
                template: experience.template,
                overrides: {
                    ...(experience.copy ? { copy: experience.copy } : {}),
                    ...(experience.commentsDisabled ? { commentsDisabled: true } : {}),
                },
            },
        }, {
            OrganizationId: experience.organization,
            LocationId: experience.location,
            UserId: experience.owner,
        });
        const sessionKeys = [];
        if (eventKeys.has(experience.key)) {
            const sessionKey = `showcase-session-${index}`;
            const pickKey = `showcase-pick-${index}`;
            add('picks', pickKey, {
                dateTime: eventStart.toISOString(),
                endDateTime: new Date(eventStart.getTime() + experience.duration * 60000).toISOString(),
                capacity: experience.capacity,
                status: 'active',
                source: 'seed',
            }, { ExperienceId: experience.key });
            add('pickedSessions', sessionKey, {
                dateTime: eventStart.toISOString(),
                endDateTime: new Date(eventStart.getTime() + experience.duration * 60000).toISOString(),
                capacity: experience.capacity,
                availableSpots: experience.capacity - 3,
                status: 'scheduled',
                syncLocked: true,
            }, { ExperienceId: experience.key, PickedOccurrenceId: pickKey });
            sessionKeys.push(sessionKey);
        } else {
            const scheduleKey = `showcase-schedule-${index}`;
            add('schedules', scheduleKey, {
                name: `${experience.title} schedule`,
                ruleType: 'cron',
                ruleCron: experience.cron,
                timezone,
                durationMinutes: experience.duration,
                capacity: experience.capacity,
                startDate: now.toISOString(),
                endDate: new Date(now.getTime() + 90 * 86400000).toISOString(),
                active: true,
            }, { ExperienceId: experience.key });
            const iterator = CronExpressionParser.parse(experience.cron, { currentDate: now, tz: timezone });
            const end = now.getTime() + 90 * 86400000;
            let occurrence = 0;
            for (let date = iterator.next().toDate(); date.getTime() < end; date = iterator.next().toDate()) {
                const sessionKey = `showcase-session-${index}-${occurrence++}`;
                const endDateTime = new Date(date.getTime() + experience.duration * 60000);
                add('sessions', sessionKey, {
                    dateTime: date.toISOString(),
                    endDateTime: endDateTime.toISOString(),
                    capacity: experience.capacity,
                    availableSpots: experience.capacity,
                    status: 'scheduled',
                    syncLocked: true,
                }, { ExperienceId: experience.key, ScheduleTemplateId: scheduleKey });
                sessionKeys.push(sessionKey);
            }
        }
        if (eventKeys.has(experience.key)) {
            add('ticketTiers', `showcase-tier-${index}`, {
                title: experience.key === 'showcase-experience-party-1' ? 'General admission' : 'Free admission',
                description: experience.key === 'showcase-experience-party-1'
                    ? 'General admission ticket for this in-person event. Drinks sold separately.'
                    : 'One free ticket for this in-person event. Drinks sold separately.',
                minAge: 18,
                maxAge: null,
                maxTickets: experience.capacity,
                idType: null,
                price: experience.key === 'showcase-experience-party-1' ? '250.00' : '0.00',
                userQuestionnary: null,
            }, { ExperienceId: experience.key });
        } else {
            experience.prices.forEach((price, tier) => add('ticketTiers', `showcase-tier-${index}-${tier}`, {
                title: ['Adult', 'Adult', 'Student', 'Child'][tier],
                description: tier === 0 ? 'Drinks included' : null,
                minAge: [18, 15, 15, 2][tier],
                maxAge: tier === 3 ? 15 : null,
                maxTickets: 10,
                idType: ['passport', null, 'student ID', null][tier],
                price: price.toFixed(2),
                userQuestionnary: tier === 0 ? [{
                    questionKey: 'confirm_18_plus',
                    prompt: 'I confirm I am 18 years of age or older',
                    required: true,
                    type: 'boolean',
                }] : null,
            }, { ExperienceId: experience.key }));
        }
        add('experienceOrganizers', `showcase-host-${index}`, {}, {
            ExperienceId: experience.key,
            UserId: experience.owner,
        });
        for (let guest = 0; guest < 3; guest += 1) {
            const pinnedFoodReview = experience.template === 'food-tour';
            const commentKey = `showcase-review-${index}-${guest}`;
            add('comments', commentKey, {
                CommentableType: 'Experience',
                stars: pinnedFoodReview ? 5 : 4 + (guest % 2),
                title: pinnedFoodReview ? ['Tasty and Well Guided Food Tour', 'Great Neighborhood Taco Tour', 'Excellent Local Food Experience'][guest] : `A memorable ${experience.title}`.slice(0, 75),
                comment: pinnedFoodReview
                    ? ['The food quality was excellent and the vendor stories were interesting. A fantastic local tour.', 'Our host introduced us to wonderful neighborhood taquerias and explained every dish. Highly recommended.', 'A generous tasting route with great local stories and delicious tacos at every stop.'][guest]
                    : `The ${experience.title} was welcoming, well organized, and enjoyable from start to finish.`,
                anonymity: 0,
                images: [],
                ParentId: null,
                repliesCount: 0,
                repliesDisabled: false,
            }, { CommentableId: experience.key, UserId: `showcase-user-guest-${guest}` });
            if (eventKeys.has(experience.key)) {
                const reservationKey = `showcase-reservation-${index}-${guest}`;
                add('experienceReservations', reservationKey, {
                    confirmationCode: `SHOWCASE-EVENT-${index}-${guest + 1}`,
                    numberOfAttendees: 1,
                    totalPrice: experience.key === 'showcase-experience-party-1' ? '250.00' : '0.00',
                    status: 'attended',
                    billingName: `${['Taylor', 'Morgan', 'Riley'][guest]} Guest`,
                    billingEmail: `showcase-guest-${guest + 1}@example.invalid`,
                }, { ScheduledExperienceId: sessionKeys[0], CustomerId: `showcase-user-guest-${guest}` });
                add('reservationAnswers', `showcase-attendance-answer-${index}-${guest}`, {
                    questionKey: 'publicAttendance',
                    answerText: 'true',
                    answerJson: null,
                }, { ExperienceReservationId: reservationKey });
            }
        }
    }
    const graph = {
        seed,
        seedKey: scenarioSeedKey('showcase', seed),
        scenario: 'showcase',
        version: 1,
        generatedAt: now.toISOString(),
        records,
        links,
    };
    validateSeedGraph(graph);
    return graph;
}

export async function buildScenario({ scenario, clock, seed, env = process.env }) {
    const password = scenario === 'startup' ? env.SEED_ADMIN_PASSWORD : env.SEED_DEMO_PASSWORD;
    if (typeof password !== 'string' || password.length < 10) {
        throw new Error(`Set ${scenario === 'startup' ? 'SEED_ADMIN_PASSWORD' : 'SEED_DEMO_PASSWORD'} (at least 10 characters)`);
    }
    return generateScenario({
        scenario, seed, clock,
        adminEmail: env.SEED_ADMIN_EMAIL,
        passwordHash: await bcrypt.hash(password, 10),
    });
}
