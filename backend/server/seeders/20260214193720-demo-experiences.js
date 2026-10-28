'use strict';

const { CronExpressionParser } = require('cron-parser');

/** @type {import('sequelize-cli').Migration} */

module.exports = {
  async up (queryInterface, Sequelize) {
    //Creating users without organizations for testing purposes
    const maleFirstNames = ['Diego', 'Luis', 'Carlos', 'Mateo', 'Jorge', 'Rafael', 'Andres', 'Pablo'];
    const femaleFirstNames = ['Sofia', 'Valeria', 'Camila', 'Isabella', 'Fernanda', 'Gabriela', 'Daniela', 'Lucia'];
    const maleProfilePictures = ['/images/users/guy1.webp', '/images/users/guy2.webp'];
    const femaleProfilePictures = ['/images/users/gal1.webp', '/images/users/gal2.jpg'];

    const pickRandom = (array) => array[Math.floor(Math.random() * array.length)];

    var testUsers = [];
    for (let i = 1; i <= 24; i++) {
      const gender = Math.random() < 0.5 ? 'male' : 'female';
      const firstName = gender === 'male' ? pickRandom(maleFirstNames) : pickRandom(femaleFirstNames);
      const profilePicture = gender === 'male' ? pickRandom(maleProfilePictures) : pickRandom(femaleProfilePictures);

      testUsers.push({
        firstName,
        lastName: 'Test',
        username: `user${i}`,
        email: `user${i}@test.com`,
        password: '$2a$10$kP2Tt1azPi7WRtxqkSmajeSQuDJLhrcFXEyrNMzbI4q3H/IdXIyxy', // hash for "testpassword"
        phoneNumber: '1234567890',
        city: `Test City ${i}`,
        country: 'Mexico',
        isEmailVerified: true,
        isRegistered: true,
        profilePicture,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
    testUsers.push({
      ...testUsers[0],
      firstName: 'Password',
      lastName: 'Reset',
      username: 'reset-e2e',
      email: 'reset-e2e@example.invalid',
    });
    const [existingUsers] = await queryInterface.sequelize.query(
      'SELECT email FROM Users WHERE email IN (:emails)',
      { replacements: { emails: testUsers.map((user) => user.email) } }
    );
    const existingUserEmails = new Set(existingUsers.map((user) => user.email));
    const usersToInsert = testUsers.filter((user) => !existingUserEmails.has(user.email));
    if (usersToInsert.length > 0) {
      await queryInterface.bulkInsert('Users', usersToInsert, {});
    }

    // Keep seeded users consistent even when they already exist
    for (const user of testUsers) {
      await queryInterface.bulkUpdate(
        'Users',
        {
          firstName: user.firstName,
          lastName: user.lastName,
          username: user.username,
          password: user.password,
          phoneNumber: user.phoneNumber,
          city: user.city,
          country: user.country,
          isEmailVerified: user.isEmailVerified,
          isRegistered: user.isRegistered,
          profilePicture: user.profilePicture,
          updatedAt: new Date(),
        },
        { email: user.email },
        {}
      );
    }
    //It would be COOL if I could get the actual address of these Geopoints from OpenStreets
    function randomCoordinates(center, distance){
      return `POINT(${center[0] + (Math.random() - 0.5) * distance[0]} ${center[1] + (Math.random() - 0.5) * distance[1]})`;
    }
    var testLocations = [];
    for (let i = 1; i <= 7; i++) {
      testLocations.push({
        name: `Test Location ${i}`,
        coordinates: Sequelize.fn('ST_GeomFromText', randomCoordinates([-105.21986, 20.64453], [0.01236 , 0.01236])),
        country: 'Mexico',
        state: 'Jalisco',
        city: 'Puerto Vallarta',
        street: `Test Street ${i}`,
        zipCode: '11111',
        timezone: 'America/Mexico_City',
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
    const [existingLocations] = await queryInterface.sequelize.query(
      'SELECT name FROM Locations WHERE name IN (:names)',
      { replacements: { names: testLocations.map((location) => location.name) } }
    );
    const existingLocationNames = new Set(existingLocations.map((location) => location.name));
    const locationsToInsert = testLocations.filter((location) => !existingLocationNames.has(location.name));
    if (locationsToInsert.length > 0) {
      await queryInterface.bulkInsert('Locations', locationsToInsert, {});
    }

    const [locations] = await queryInterface.sequelize.query(
      "SELECT id, name FROM Locations WHERE name LIKE 'Test Location %' ORDER BY id ASC"
    );
    const organizationBrands = [
      { primaryColor: '#7c3aed', accentColor: '#f97316', font: 'inter', layoutTemplate: 'classic', tagline: 'Private venues. Great company. Free entry.', about: 'We bring people together for special bar nights and parties at private venues around Puerto Vallarta. Reserve your free ticket and join us in person.' },
      { primaryColor: '#9a3412', accentColor: '#f59e0b', font: 'lato', layoutTemplate: 'editorial', tagline: 'Taste the neighborhood with local food lovers', about: 'Meet the cooks, discover neighborhood taquerias and share the flavors of Puerto Vallarta with our small-group food tours.' },
      { primaryColor: '#0f766e', accentColor: '#f59e0b', font: 'system', layoutTemplate: 'classic', tagline: 'Explore the coast, one adventure at a time', about: 'Join our local guides for relaxed coastal adventures and unforgettable days on the bay.' },
    ];
    var testOrganizations = [];
    for (let i = 1; i <= 3; i++) {
      testOrganizations.push({
        name: `Test Company ${i}`,
        organizationUsername: `testcompany${i}`,
        slug: `testcompany${i}`,
        ...organizationBrands[i - 1],
        logoMediaKey: null,
        coverMediaKey: null,
        coverMediaType: 'image',
        socialLinks: JSON.stringify({ website: `https://example.com/testcompany${i}` }),
        contactLinks: JSON.stringify({ email: `contact@testcompany${i}.com`, website: `https://example.com/testcompany${i}` }),
        email: `contact@testcompany${i}.com`,
        LocationId: locations[i-1].id,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
    await queryInterface.bulkInsert('Organizations', testOrganizations, { ignoreDuplicates: true });
    for (const organization of testOrganizations) {
      await queryInterface.bulkUpdate('Organizations', {
        ...organizationBrands[Number(organization.organizationUsername.slice(-1)) - 1],
        updatedAt: new Date(),
      }, { organizationUsername: organization.organizationUsername }, {});
    }


    const [orgs] = await queryInterface.sequelize.query(
      "SELECT id FROM Organizations WHERE name LIKE 'Test Company %' ORDER BY id ASC"
    );
    const [users] = await queryInterface.sequelize.query(
      "SELECT id FROM Users WHERE email LIKE 'user%@test.com' ORDER BY id ASC"
    );

    var orgMembers = [];
    for (let i = 0; i < users.length-2; i++) {
      orgMembers.push({
      UserId: users[i].id,
      OrganizationId: orgs[i % orgs.length].id,
      isAdmin: i < 3 ? true : false,   // First 3 users are admins, the rest are regular members
      createdAt: new Date(),
      updatedAt: new Date()
      });
    }
    if (orgMembers.length > 0) {
      await queryInterface.bulkInsert('OrganizationMembers', orgMembers, { ignoreDuplicates: true });

      const organizerUserIds = Array.from(new Set(orgMembers.map((member) => member.UserId)));

      const [organizerUsers] = await queryInterface.sequelize.query(
        'SELECT id, firstName, lastName, email FROM Users WHERE id IN (:userIds)',
        { replacements: { userIds: organizerUserIds } }
      );

      const organizerTemplates = [
        'I specialize in guest onboarding, experience timing, and smooth day-of coordination for local experiences.',
        'I focus on logistics planning, vendor communication, and reliable schedule execution for every experience.',
        'I lead attendee support, check-in flow, and on-site problem solving to keep experiences running seamlessly.',
        'I coordinate staffing, session transitions, and quality checks to deliver consistently great guest experiences.',
        'I manage experience operations, timeline adherence, and participant communication from setup through wrap-up.',
      ];

      const organizerProfiles = organizerUsers.map((organizerUser, index) => ({
        UserId: organizerUser.id,
        description: organizerTemplates[index % organizerTemplates.length],
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      await queryInterface.bulkInsert('Organizers', organizerProfiles, { ignoreDuplicates: true });

      for (const organizerProfile of organizerProfiles) {
        await queryInterface.bulkUpdate(
          'Organizers',
          {
            description: organizerProfile.description,
            updatedAt: new Date(),
          },
          { UserId: organizerProfile.UserId },
          {}
        );
      }
    }

    const testLocationMap = locations.reduce((accumulator, location) => {
      accumulator[location.name] = location.id;
      return accumulator;
    }, {});

    const locationOwnershipByName = {
      'Test Location 1': orgs[0]?.id,
      'Test Location 2': orgs[1]?.id,
      'Test Location 3': orgs[2]?.id,
      'Test Location 4': orgs[0]?.id,
      'Test Location 5': orgs[0]?.id,
      'Test Location 6': orgs[2]?.id,
      'Test Location 7': orgs[1]?.id,
    };

    for (const [locationName, ownerOrganizationId] of Object.entries(locationOwnershipByName)) {
      const locationId = testLocationMap[locationName];

      if (locationId && ownerOrganizationId) {
        await queryInterface.bulkUpdate(
          'Locations',
          {
            OrganizationId: ownerOrganizationId,
            updatedAt: new Date(),
          },
          { id: locationId },
          {}
        );
      }
    }

    const { prepareShowcaseMedia } = await import('../seed-factory/showcase-media.js');
    const showcaseMedia = await prepareShowcaseMedia({
      ownerId: users[0].id,
      ownerIds: { party: users[0].id, food: users[1].id, default: users[2].id },
    });
    const partyTitles = new Set(['Private Rooftop Party', 'Bar Special Night']);
    const renamedTitles = {
      'Sierra Ridge Sunrise Hike': 'Private Rooftop Party',
      'Rooftop Craft Mixology Session': 'Bar Special Night',
    };
    for (const [previousTitle, title] of Object.entries(renamedTitles)) {
      await queryInterface.bulkUpdate('Experiences', { title }, { title: previousTitle }, {});
    }

    const rawTestExperiences = [
      {
        OrganizationId: orgs[0].id,
        LocationId: testLocationMap['Test Location 4'],
        capacity: 14,
        duration: 150,
        title: 'Private Rooftop Party',
        subtitle: 'One special night, a private rooftop and free registration',
        description: 'Join our local party hosts for a relaxed night of music and conversation at a private rooftop venue. Reserve a free admission ticket, show it at the door, and meet the people who have already checked in. Drinks are sold separately at the venue.',
        ratings: 4.68,
        commentsCount: 10,
        thumbnail: '/images/events/hiking/1.jpg',
        userQuestionnary: [
          {
            questionKey: 'ready_to_have_fun',
            prompt: 'Ready to have fun???',
            required: false,
          },
        ],
        images: [
          '/images/events/hiking/Colorado-Dirt-Bike-Trails-1-2802882796.jpg',
          '/images/events/hiking/Snapseed8-min-2242294099.jpg'
        ],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        OrganizationId: orgs[0].id,
        LocationId: testLocationMap['Test Location 5'],
        capacity: 12,
        duration: 120,
        title: 'Bar Special Night',
        subtitle: 'Free tickets to a one-night neighborhood celebration',
        description: 'A special evening for friends old and new at one of our favorite private venues. Registration and admission are free. Bring your ticket for check-in, enjoy the music and order anything you like directly from the bar.',
        ratings: 4.31,
        commentsCount: 10,
        thumbnail: '/images/events/mixology/Adobe_Stock_591027595_46a5f4e8da-3040219346.jpeg',
        userQuestionnary: [
          {
            questionKey: 'where_will_youprompt_be_staying',
            prompt: 'Ready to have fun???',
            required: false,
          },
        ],
        images: [
          '/images/events/mixology/16185020296_6bef8f6155_z-2290716816.jpg',
          '/images/events/mixology/Pacifico-beer-1345129699.jpeg'
        ],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        OrganizationId: orgs[2].id,
        LocationId: testLocationMap['Test Location 6'],
        capacity: 20,
        duration: 180,
        title: 'Los Arcos Coastal Sightseeing Tour',
        subtitle: 'Scenic highlights and cultural landmarks in one route',
        description: `Travel through a curated route of signature waterfront landmarks, old-town streets, and elevated overlooks, with guided stops that combine cultural context, architecture notes, and practical photo timing tips.

      The experience blends walking segments with short transfers, allowing guests to cover diverse viewpoints without rushing, and includes dedicated time for observation at key stops near Los Arcos and the Malecón.

      Throughout the tour, your guide connects each location to local traditions, public art, and neighborhood changes that shaped modern Puerto Vallarta.`,
        ratings: 3.94,
        commentsCount: 10,
        thumbnail: '/images/events/sightseeing/los-arcos-malecón-3-1536x864-3329920682.jpg',
        userQuestionnary: [
          {
            questionKey: 'ready_to_have_fun',
            prompt: 'Ready to have fun???',
            required: false,
          },
        ],
        images: [
          '/images/events/sightseeing/3979126-1490623130.jpg',
          '/images/events/sightseeing/caballito-de-puerto-vallarta-3841453848.jpg',
          '/images/events/sightseeing/optimizada_Discovering_the_Arts_of_Puerto_Vallarta-1608480040.jpg',
          '/images/events/sightseeing/optimizada_puerto-vallarta-travel-guide-1246512186.jpg',
          '/images/events/sightseeing/Puerto-Vallarta-Airport-Transfers-Old-Town-Romantic-Zone-2260430990.jpg',
          '/images/events/sightseeing/Puerto-Vallarta-Ultimate-Guide-1-819x1024-2881566776.png',
          '/images/events/sightseeing/visit-puerto-vallarta-2023-los-arcos-972559352.jpg'
        ],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        OrganizationId: orgs[1].id,
        LocationId: testLocationMap['Test Location 7'],
        capacity: 16,
        duration: 120,
        title: 'Old Town Taco Tour',
        subtitle: 'Street taco crawl through neighborhood favorites',
        description: `Move through a handpicked lineup of neighborhood taquerias and street stands, sampling distinct styles that highlight preparation methods, regional sauces, and ingredient variations from stop to stop.

      Your host explains how each taco is built, why specific cuts and marinades are used, and how local preferences shape toppings, heat levels, and serving rhythm during peak hours.

      Between tastings, guests hear stories from vendors and receive practical recommendations for ordering confidently, pairing beverages, and identifying specialty menus beyond the standard tourist route.`,
        ratings: 4.82,
        commentsCount: 10,
        thumbnail: '/images/events/taco-tour/AdobeStock_205566472-3914830821.jpeg',
        userQuestionnary: [
          {
            questionKey: 'ready_to_have_fun',
            prompt: 'Ready to have fun???',
            required: false,
          },
        ],
        images: [

          '/images/events/taco-tour/ArdHgW3PYzfXi8kZ6Pbxv7K6NphtB9Pb8cAB7UJjIxU-3713760731.jpg',
          '/images/events/taco-tour/tacos-culture-in-puerto-vallarta-441282808.jpg'
        ],
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    for (const experience of rawTestExperiences) {
      const isParty = partyTitles.has(experience.title);
      const isFoodTour = experience.title === 'Old Town Taco Tour';
      experience.images = isParty ? showcaseMedia.partyImages : isFoodTour ? showcaseMedia.foodImages : showcaseMedia.defaultImages;
      experience.thumbnail = experience.images[0];
      experience.autoSyncEnabled = !isParty;
      experience.detailsMetadata = {
        version: 1,
        template: isParty ? 'party' : isFoodTour ? 'food-tour' : 'default',
        overrides: isFoodTour ? { heroVideoKey: showcaseMedia.heroVideo, heroPosterKey: showcaseMedia.heroPoster } : {},
      };
      if (isParty) experience.userQuestionnary = [{
        questionKey: 'publicAttendance',
        prompt: 'Show my registered name and profile picture on the public checked-in guest list',
        required: false,
        type: 'boolean',
      }];
    }

    const testExperiences = rawTestExperiences.map((experience) => ({
      ...experience,
      images: JSON.stringify(experience.images),
      detailsMetadata: JSON.stringify(experience.detailsMetadata),
      userQuestionnary: JSON.stringify(experience.userQuestionnary || [])
    }));

    const [existingExperiences] = await queryInterface.sequelize.query(
      'SELECT title FROM Experiences WHERE title IN (:titles)',
      { replacements: { titles: testExperiences.map((experience) => experience.title) } }
    );
    const existingExperienceTitles = new Set(existingExperiences.map((experience) => experience.title));
    const experiencesToInsert = testExperiences.filter((experience) => !existingExperienceTitles.has(experience.title));
    if (experiencesToInsert.length > 0) {
      await queryInterface.bulkInsert('Experiences', experiencesToInsert, {});
    }

    for (const experience of testExperiences) {
      await queryInterface.bulkUpdate(
        'Experiences',
        {
          OrganizationId: experience.OrganizationId,
          LocationId: experience.LocationId,
          capacity: experience.capacity,
          title: experience.title,
          subtitle: experience.subtitle,
          description: experience.description,
          commentsCount: experience.commentsCount,
          ratings: experience.ratings,
          userQuestionnary: experience.userQuestionnary,
          images: experience.images,
          thumbnail: experience.thumbnail,
          autoSyncEnabled: experience.autoSyncEnabled,
          detailsMetadata: experience.detailsMetadata,
          scheduling: null,
          updatedAt: new Date(),
        },
        { title: experience.title },
        {}
      );
    }

    const [seededExperiences] = await queryInterface.sequelize.query(
      'SELECT id, OrganizationId, title FROM Experiences WHERE title IN (:titles) ORDER BY id ASC',
      { replacements: { titles: testExperiences.map((experience) => experience.title) } }
    );

    const [seededExperiencesWithScheduleData] = await queryInterface.sequelize.query(
      'SELECT id, title, capacity, duration FROM Experiences WHERE id IN (:experienceIds) ORDER BY id ASC',
      { replacements: { experienceIds: seededExperiences.map((experience) => experience.id) } }
    );

    // Cron schedules for seeded experiences (formerly stored in Experience.scheduling, now only in ScheduleTemplates)
    const cronByTitle = {
      'Los Arcos Coastal Sightseeing Tour': '0 9,13,17 * * 1,3,5',
      'Old Town Taco Tour': '0 9,13,17 * * 1,3,5',
    };

    const now = new Date();
    const syncWindowEnd = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

    // We'll create ScheduleTemplate rows for experiences that have a cron 'scheduling' field,
    // and PickedOccurrences for fallback one-off occurrences. Then materialize ScheduledExperiences
    // that reference the corresponding source ids so the new scheduling schema is populated.
    const scheduleTemplatesToInsert = [];
    const pickedOccurrencesToInsert = [];
    const materializedScheduled = [];

    seededExperiencesWithScheduleData.forEach((experience) => {
      const durationInMinutes = Number(experience.duration || 60);
      const capacity = Number(experience.capacity || 0);
      const cronExpression = cronByTitle[experience.title] || null;

      if (!cronExpression) {
        const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        const fallbackStart = partyTitles.has(experience.title)
          ? CronExpressionParser.parse('0 20 * * *', {
            currentDate: nextWeek,
            tz: 'America/Mexico_City',
          }).next().toDate()
          : nextWeek;

        (partyTitles.has(experience.title) ? [0] : [0, 7, 14]).forEach((offsetDays) => {
          const dateTime = new Date(fallbackStart);
          dateTime.setDate(fallbackStart.getDate() + offsetDays);
          const endDateTime = new Date(dateTime.getTime() + durationInMinutes * 60000);

          // create a picked occurrence and materialized scheduled row referencing it later
          pickedOccurrencesToInsert.push({
            ExperienceId: experience.id,
            dateTime,
            endDateTime,
            capacity,
            status: 'active',
            source: 'seed',
            createdAt: new Date(),
            updatedAt: new Date(),
          });

          materializedScheduled.push({
            ExperienceId: experience.id,
            dateTime,
            endDateTime,
            capacity,
            availableSpots: capacity,
            status: 'scheduled',
            // PickedOccurrenceId will be filled after inserting picked occurrences
            _sourceType: 'picked',
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        });

        return;
      }

      // Use Mexico City timezone for seeded experiences (Central Standard Time - Mexico)
      const seederTimezone = 'America/Mexico_City';
      const options = {
        currentDate: now,
        endDate: syncWindowEnd,
        iterator: true,
        tz: seederTimezone,
      };

      // create a schedule template for this experience; expansion will be materialized now
      scheduleTemplatesToInsert.push({
        ExperienceId: experience.id,
        name: `${experience.title} template`,
        ruleType: 'cron',
        ruleCron: cronExpression,
        durationMinutes: Number(experience.duration || 60),
        capacity: Number(experience.capacity || 0),
        timezone: seederTimezone,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Expand the cron now to provide demo sessions and attach to template later
      const interval = CronExpressionParser.parse(cronExpression, options);
      let createdCount = 0;

      for (const item of interval) {
        const dateTime = item.toDate();
        const endDateTime = new Date(dateTime.getTime() + durationInMinutes * 60000);

        materializedScheduled.push({
          ExperienceId: experience.id,
          dateTime,
          endDateTime,
          capacity,
          availableSpots: capacity,
          status: 'scheduled',
          _sourceType: 'template',
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        createdCount += 1;
        if (createdCount >= 24) {
          break;
        }
      }
    });

    // Insert templates and picks, then resolve their generated IDs to materialize scheduled rows
    await queryInterface.bulkDelete('ScheduleTemplates', {
      ExperienceId: { [Sequelize.Op.in]: seededExperiences.filter((experience) => partyTitles.has(experience.title)).map((experience) => experience.id) },
    }, {});
    if (scheduleTemplatesToInsert.length > 0) {
      await queryInterface.bulkInsert('ScheduleTemplates', scheduleTemplatesToInsert, {});
    }

    if (pickedOccurrencesToInsert.length > 0) {
      await queryInterface.bulkDelete('PickedOccurrences', {
        ExperienceId: { [Sequelize.Op.in]: seededExperiences.filter((experience) => partyTitles.has(experience.title)).map((experience) => experience.id) },
      }, {});
      await queryInterface.bulkInsert('PickedOccurrences', pickedOccurrencesToInsert, {});
    }

    // Query back inserted templates and picks to obtain their ids
    const [insertedTemplates] = await queryInterface.sequelize.query(
      'SELECT id, ExperienceId FROM ScheduleTemplates WHERE ExperienceId IN (:experienceIds)',
      { replacements: { experienceIds: seededExperiences.map((e) => e.id) } }
    );

    const templateByExperience = insertedTemplates.reduce((acc, t) => { acc[t.ExperienceId] = t.id; return acc; }, {});

    const [insertedPicks] = await queryInterface.sequelize.query(
      'SELECT id, ExperienceId, dateTime FROM PickedOccurrences WHERE ExperienceId IN (:experienceIds)',
      { replacements: { experienceIds: seededExperiences.map((e) => e.id) } }
    );

    // Map picks by ExperienceId+dateTime string for lookup
    const pickIndex = {};
    insertedPicks.forEach((p) => {
      const key = `${p.ExperienceId}::${new Date(p.dateTime).toISOString()}`;
      pickIndex[key] = p.id;
    });

    // Build final scheduled rows with source ids
    const finalScheduled = materializedScheduled.map((row) => {
      if (row._sourceType === 'template') {
        return {
          ExperienceId: row.ExperienceId,
          dateTime: row.dateTime,
          endDateTime: row.endDateTime,
          capacity: row.capacity,
          availableSpots: row.availableSpots,
          status: row.status,
          ScheduleTemplateId: templateByExperience[row.ExperienceId] || null,
          PickedOccurrenceId: null,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
        };
      }

      // picked
      const pickKey = `${row.ExperienceId}::${new Date(row.dateTime).toISOString()}`;
      return {
        ExperienceId: row.ExperienceId,
        dateTime: row.dateTime,
        endDateTime: row.endDateTime,
        capacity: row.capacity,
        availableSpots: row.availableSpots,
        status: row.status,
        ScheduleTemplateId: null,
        PickedOccurrenceId: pickIndex[pickKey] || null,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      };
    });

    const demoConfirmationCodes = seededExperiences
      .filter((experience) => partyTitles.has(experience.title))
      .flatMap((experience) => users.slice(0, 3).map((user) => `DEMO-PARTY-${experience.id}-${user.id}`));
    await queryInterface.bulkDelete('ExperienceReservations', {
      confirmationCode: { [Sequelize.Op.in]: demoConfirmationCodes },
    }, {});
    await queryInterface.bulkDelete('ScheduledExperiences', {
      ExperienceId: {
        [Sequelize.Op.in]: seededExperiences.map((experience) => experience.id),
      },
    }, {});

    if (finalScheduled.length > 0) {
      await queryInterface.bulkInsert('ScheduledExperiences', finalScheduled, {});
    }
    const [partySessions] = await queryInterface.sequelize.query(
      'SELECT id, ExperienceId FROM ScheduledExperiences WHERE ExperienceId IN (:experienceIds)',
      { replacements: { experienceIds: seededExperiences.filter((experience) => partyTitles.has(experience.title)).map((experience) => experience.id) } }
    );
    const checkedInReservations = partySessions.flatMap((session) => users.slice(0, 3).map((user) => ({
      confirmationCode: `DEMO-PARTY-${session.ExperienceId}-${user.id}`,
      ScheduledExperienceId: session.id,
      CustomerId: user.id,
      numberOfAttendees: 1,
      totalPrice: 0,
      status: 'attended',
      billingName: 'Demo guest',
      createdAt: new Date(),
      updatedAt: new Date(),
    })));
    if (checkedInReservations.length) {
      await queryInterface.bulkInsert('ExperienceReservations', checkedInReservations, {});
      const [reservations] = await queryInterface.sequelize.query(
        'SELECT id FROM ExperienceReservations WHERE confirmationCode IN (:codes)',
        { replacements: { codes: demoConfirmationCodes } }
      );
      await queryInterface.bulkInsert('ExperienceReservationAnswers', reservations.map((reservation) => ({
        ExperienceReservationId: reservation.id,
        questionKey: 'publicAttendance',
        answerText: 'true',
        createdAt: new Date(),
        updatedAt: new Date(),
      })), {});
      for (const session of partySessions) {
        const seeded = finalScheduled.find((row) => row.ExperienceId === session.ExperienceId);
        await queryInterface.bulkUpdate('ScheduledExperiences', {
          availableSpots: Math.max(0, seeded.capacity - 3),
        }, { id: session.id }, {});
      }
    }

    const ticketPricesByExperienceTitle = {
      'Los Arcos Coastal Sightseeing Tour': {
        adultDrinksIncluded: 64.99,
        adult: 49.99,
        student: 34.99,
        child: 19.99,
      },
      'Old Town Taco Tour': {
        adultDrinksIncluded: 59.99,
        adult: 44.99,
        student: 32.99,
        child: 17.99,
      },
    };

    const ticketTiers = [];
    const timestamp = new Date();

    seededExperiences.forEach((experience) => {
      const prices = ticketPricesByExperienceTitle[experience.title] || {
        adultDrinksIncluded: 59.99,
        adult: 44.99,
        student: 34.99,
        child: 19.99,
      };

      const baseTiers = partyTitles.has(experience.title) ? [{
        title: 'Free admission',
        description: 'One free ticket for this in-person event. Drinks sold separately.',
        minAge: 18,
        maxAge: null,
        idType: null,
        price: 0,
      }] : [
        {
          title: 'Adult',
          description: 'Drinks included',
          minAge: 18,
          maxAge: null,
          idType: 'passport',
          price: prices.adultDrinksIncluded,
          userQuestionnary: JSON.stringify([
            { questionKey: 'confirm_18_plus', prompt: 'I confirm I am 18 years of age or older', required: true, type: 'boolean' },
          ]),
        },
        {
          title: 'Adult',
          description: null,
          minAge: 15,
          maxAge: null,
          idType: null,
          price: prices.adult,
        },
        {
          title: 'Student',
          description: null,
          minAge: 15,
          maxAge: null,
          idType: 'student ID',
          price: prices.student,
        },
        {
          title: 'Child',
          description: null,
          minAge: 2,
          maxAge: 15,
          idType: null,
          price: prices.child,
        },
      ];

      baseTiers.forEach((tier) => {
        const tierRow = {
          ExperienceId: experience.id,
          title: tier.title,
          description: tier.description,
          minAge: tier.minAge,
          maxAge: tier.maxAge,
          maxTickets: 10,
          idType: tier.idType,
          price: tier.price,
          userQuestionnary: tier.userQuestionnary || null,
          createdAt: timestamp,
          updatedAt: timestamp,
        };

        ticketTiers.push(tierRow);
      });
    });

    await queryInterface.bulkDelete('TicketTiers', {
      ExperienceId: {
        [Sequelize.Op.in]: seededExperiences.map((experience) => experience.id),
      },
    }, {});

    if (ticketTiers.length > 0) {
      await queryInterface.bulkInsert('TicketTiers', ticketTiers, {});
    }

    const [organizationMembers] = await queryInterface.sequelize.query(
      'SELECT UserId, OrganizationId FROM OrganizationMembers WHERE OrganizationId IN (:orgIds) ORDER BY UserId ASC',
      { replacements: { orgIds: orgs.map((organization) => organization.id) } }
    );

    const membersByOrganization = organizationMembers.reduce((accumulator, member) => {
      if (!accumulator[member.OrganizationId]) {
        accumulator[member.OrganizationId] = [];
      }
      accumulator[member.OrganizationId].push(member.UserId);
      return accumulator;
    }, {});
    const experienceOrganizers = [];
    seededExperiences.forEach((experience) => {
      const memberIds = membersByOrganization[experience.OrganizationId] || [];
      const selectedMemberIds = memberIds.slice(0, Math.min(2, memberIds.length));

      selectedMemberIds.forEach((userId) => {
        const organizerRow = {
          ExperienceId: experience.id,
          UserId: userId,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        experienceOrganizers.push(organizerRow);
      });
    });

    await queryInterface.bulkDelete('ExperienceOrganizers', {
      ExperienceId: { [Sequelize.Op.in]: seededExperiences.map((experience) => experience.id) },
    }, {});
    if (experienceOrganizers.length > 0) {
      await queryInterface.bulkInsert('ExperienceOrganizers', experienceOrganizers, { ignoreDuplicates: true });
    }

    const organizerUserIds = Array.from(new Set(experienceOrganizers.map((organizer) => organizer.UserId)));

    const [existingOrganizers] = await queryInterface.sequelize.query(
      'SELECT id, UserId FROM Organizers WHERE UserId IN (:userIds) ORDER BY UserId ASC, id ASC',
      { replacements: { userIds: organizerUserIds } }
    );

    const organizerIdsToDelete = [];
    const seenOrganizerUserIds = new Set();
    existingOrganizers.forEach((organizer) => {
      if (seenOrganizerUserIds.has(organizer.UserId)) {
        organizerIdsToDelete.push(organizer.id);
        return;
      }

      seenOrganizerUserIds.add(organizer.UserId);
    });

    if (organizerIdsToDelete.length > 0) {
      await queryInterface.bulkDelete('Comments', {
        CommentableType: 'Organizer',
        CommentableId: {
          [Sequelize.Op.in]: organizerIdsToDelete,
        },
      }, {});

      await queryInterface.bulkDelete('Organizers', {
        id: {
          [Sequelize.Op.in]: organizerIdsToDelete,
        },
      }, {});
    }

    const [seededOrganizers] = await queryInterface.sequelize.query(
      'SELECT id, UserId FROM Organizers WHERE UserId IN (:userIds) ORDER BY id ASC',
      { replacements: { userIds: organizerUserIds } }
    );

    const sentimentPool = ['positive', 'positive', 'positive', 'mixed', 'neutral'];
    const anonymityLevels = [0, 1, 2];
    const reviewImagePoolByTitle = rawTestExperiences.reduce((accumulator, experience) => {
      accumulator[experience.title] = [
        experience.thumbnail,
        ...(Array.isArray(experience.images) ? experience.images : []),
      ].filter(Boolean);
      return accumulator;
    }, {});

    const buildSeededReviewImages = (experienceTitle, reviewIndex) => {
      const pool = reviewImagePoolByTitle[experienceTitle] || [];

      if (pool.length === 0 || reviewIndex % 3 !== 0) {
        return [];
      }

      const maxImages = Math.min(3, pool.length);
      const imageCount = reviewIndex % 2 === 0 ? maxImages : Math.min(2, maxImages);

      return Array.from({ length: imageCount }, (_, offset) => {
        const imageUrl = pool[(reviewIndex + offset) % pool.length];

        return {
          imageUrl,
          accessibleText: `${experienceTitle} guest photo ${offset + 1}`,
        };
      });
    };

    const buildCommentByTitle = (experienceTitle, sentiment) => {
      if (experienceTitle.toLowerCase().includes('hike')) {
        if (sentiment === 'positive') {
          return {
            title: 'Great Sunrise Trail Experience',
            comment: 'The pace was well managed, the guide kept everyone safe on the switchbacks, and the ridge sunrise views were worth the early start. I would book this hike again.',
          };
        }

        if (sentiment === 'mixed') {
          return {
            title: 'Beautiful Views, Tougher Than Expected',
            comment: 'The route and scenery were excellent, but the uphill sections felt more challenging than I anticipated. Still, the guide support and summit views made it a solid experience.',
          };
        }

        return {
          title: 'Scenic and Well Organized',
          comment: 'This hike delivered nice lookout points and clear instructions throughout. It was a good outdoor activity with a reliable route and friendly group atmosphere.',
        };
      }

      if (experienceTitle.toLowerCase().includes('mixology')) {
        if (sentiment === 'positive') {
          return {
            title: 'Fun and Practical Mixology Class',
            comment: 'Excellent workshop format with useful techniques I can repeat at home. The ingredient tasting and cocktail balancing tips were clear, interactive, and very enjoyable.',
          };
        }

        if (sentiment === 'mixed') {
          return {
            title: 'Good Lesson, Slightly Fast Pace',
            comment: 'The class covered strong fundamentals and the drinks tasted great, but some parts moved quickly for beginners. Overall, it was still a valuable and entertaining session.',
          };
        }

        return {
          title: 'Solid Intro to Craft Cocktails',
          comment: 'The host explained tools, flavor balance, and garnish choices in a straightforward way. It felt organized and approachable, especially for first-time participants.',
        };
      }

      if (experienceTitle.toLowerCase().includes('sightseeing') || experienceTitle.toLowerCase().includes('los arcos')) {
        if (sentiment === 'positive') {
          return {
            title: 'Excellent Coastal Sightseeing Tour',
            comment: 'Great route planning and timing across landmarks, viewpoints, and old-town areas. The local context from the guide added depth and made each stop more meaningful.',
          };
        }

        if (sentiment === 'mixed') {
          return {
            title: 'Nice Stops, Busy in Some Areas',
            comment: 'The highlights were very photogenic and informative, though a couple of stops felt crowded during peak hours. The overall pacing and landmark coverage were still good.',
          };
        }

        return {
          title: 'Reliable Tour of Key Highlights',
          comment: 'A balanced itinerary with scenic viewpoints and cultural notes along the way. It is a dependable option to see major Puerto Vallarta spots in one experience.',
        };
      }

      if (sentiment === 'positive') {
        return {
          title: 'Delicious and Authentic Taco Crawl',
          comment: 'Fantastic taco variety at each stop, with clear guidance on what to try and why each style is different. The host made the whole route fun and informative.',
        };
      }

      if (sentiment === 'mixed') {
        return {
          title: 'Great Flavor, Slightly Long Route',
          comment: 'The food quality was excellent and the vendor stories were interesting, but the full route took longer than expected. Even so, it was a worthwhile local food experience.',
        };
      }

      return {
        title: 'Tasty and Well Guided Food Tour',
        comment: 'Good balance of flavor, local context, and practical ordering tips at each taqueria. This was a comfortable way to explore neighborhood taco favorites.',
      };
    };

    const clampToStarRange = (value) => Math.max(3, Math.min(5, value));

    const buildOrganizerComment = (sentiment) => {
      if (sentiment === 'positive') {
        return {
          title: 'Excellent Organizer and Communication',
          comment: 'The organizer was professional, responsive, and very clear with experience details. Logistics were smooth and the overall guest experience felt thoughtful from start to finish.',
        };
      }

      if (sentiment === 'mixed') {
        return {
          title: 'Good Support with Minor Delays',
          comment: 'Communication was generally helpful and the organizer handled the experience well, though a couple updates came later than expected. Overall, the experience was still positive.',
        };
      }

      return {
        title: 'Reliable and Helpful Host',
        comment: 'The organizer provided clear instructions, answered questions quickly, and kept the experience flow organized. A dependable host for a comfortable and enjoyable experience.',
      };
    };

    const experienceComments = [];
    const organizerComments = [];
    const commentTimestamp = new Date();

    seededExperiences.forEach((experience) => {
      users.forEach((user, userIndex) => {
        const isPinnedFoodReview = experience.title === 'Old Town Taco Tour' && userIndex < 3;
        const sentiment = isPinnedFoodReview ? 'positive' : sentimentPool[Math.floor(Math.random() * sentimentPool.length)];
        const anonymity = anonymityLevels[Math.floor(Math.random() * anonymityLevels.length)];

        let stars;
        if (sentiment === 'positive') {
          stars = clampToStarRange(4 + Math.floor(Math.random() * 2));
        } else if (sentiment === 'mixed') {
          stars = clampToStarRange(3 + Math.floor(Math.random() * 2));
        } else {
          stars = 3;
        }
        if (isPinnedFoodReview) stars = 5;

        const sentimentComment = buildCommentByTitle(experience.title, sentiment);

        experienceComments.push({
          UserId: user.id,
          CommentableId: experience.id,
          CommentableType: 'Experience',
          stars,
          title: sentimentComment.title,
          comment: sentimentComment.comment,
          anonymity,
          images: JSON.stringify(buildSeededReviewImages(experience.title, userIndex)),
          createdAt: commentTimestamp,
          updatedAt: commentTimestamp,
        });
      });
    });

    seededOrganizers.forEach((organizer) => {
      users.forEach((user) => {
        if (user.id === organizer.UserId) {
          return;
        }

        const sentiment = sentimentPool[Math.floor(Math.random() * sentimentPool.length)];
        const anonymity = anonymityLevels[Math.floor(Math.random() * anonymityLevels.length)];

        let stars;
        if (sentiment === 'positive') {
          stars = clampToStarRange(4 + Math.floor(Math.random() * 2));
        } else if (sentiment === 'mixed') {
          stars = clampToStarRange(3 + Math.floor(Math.random() * 2));
        } else {
          stars = 3;
        }

        const sentimentComment = buildOrganizerComment(sentiment);

        organizerComments.push({
          UserId: user.id,
          CommentableId: organizer.id,
          CommentableType: 'Organizer',
          stars,
          title: sentimentComment.title,
          comment: sentimentComment.comment,
          anonymity,
          images: JSON.stringify([]),
          createdAt: commentTimestamp,
          updatedAt: commentTimestamp,
        });
      });
    });

    await queryInterface.bulkDelete('Comments', {
      CommentableType: 'Experience',
      CommentableId: {
        [Sequelize.Op.in]: seededExperiences.map((experience) => experience.id),
      },
      UserId: {
        [Sequelize.Op.in]: users.map((user) => user.id),
      },
    }, {});

    await queryInterface.bulkDelete('Comments', {
      CommentableType: 'Organizer',
      CommentableId: {
        [Sequelize.Op.in]: seededOrganizers.map((organizer) => organizer.id),
      },
      UserId: {
        [Sequelize.Op.in]: users.map((user) => user.id),
      },
    }, {});

    if (experienceComments.length > 0) {
      await queryInterface.bulkInsert('Comments', experienceComments, {});
    }
    const foodExperience = seededExperiences.find((experience) => experience.title === 'Old Town Taco Tour');
    if (foodExperience) {
      const [pinnedReviews] = await queryInterface.sequelize.query(
        "SELECT id FROM Comments WHERE CommentableType = 'Experience' AND CommentableId = :experienceId AND UserId IN (:userIds) AND stars = 5 ORDER BY id ASC LIMIT 3",
        { replacements: { experienceId: foodExperience.id, userIds: users.slice(0, 3).map((user) => user.id) } }
      );
      const detailsMetadata = {
        version: 1,
        template: 'food-tour',
        overrides: {
          heroVideoKey: showcaseMedia.heroVideo,
          heroPosterKey: showcaseMedia.heroPoster,
          pinnedCommentIds: pinnedReviews.map((review) => review.id),
        },
      };
      await queryInterface.bulkUpdate('Experiences', {
        detailsMetadata: JSON.stringify(detailsMetadata),
      }, { id: foodExperience.id }, {});
    }

    if (organizerComments.length > 0) {
      await queryInterface.bulkInsert('Comments', organizerComments, {});
    }



  },

  async down (queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const testUserEmails = Array.from({ length: 24 }, (_, index) => `user${index + 1}@test.com`);
      testUserEmails.push('reset-e2e@example.invalid');
      const testLocationNames = Array.from({ length: 7 }, (_, index) => `Test Location ${index + 1}`);
      const seededExperienceTitles = [
        'Sierra Ridge Sunrise Hike',
        'Rooftop Craft Mixology Session',
        'Private Rooftop Party',
        'Bar Special Night',
        'Los Arcos Coastal Sightseeing Tour',
        'Old Town Taco Tour'
      ];

      const [seededExperiences] = await queryInterface.sequelize.query(
        'SELECT id FROM Experiences WHERE title IN (:titles)',
        { replacements: { titles: seededExperienceTitles }, transaction }
      );

      const [seededOrganizations] = await queryInterface.sequelize.query(
        "SELECT id FROM Organizations WHERE name LIKE 'Test Company %'",
        { transaction }
      );

      const [seededUsers] = await queryInterface.sequelize.query(
        'SELECT id FROM Users WHERE email IN (:emails)',
        { replacements: { emails: testUserEmails }, transaction }
      );

      const seededExperienceIds = seededExperiences.map((experience) => experience.id);
      const seededUserIds = seededUsers.map((user) => user.id);
      const seededOrganizationIds = seededOrganizations.map((organization) => organization.id);
      if (seededExperienceIds.length && seededUserIds.length) {
        await queryInterface.bulkDelete('ExperienceReservations', {
          confirmationCode: {
            [Sequelize.Op.in]: seededExperienceIds.flatMap((experienceId) =>
              seededUserIds.map((userId) => `DEMO-PARTY-${experienceId}-${userId}`)),
          },
        }, { transaction });
      }

      const [seededOrganizers] = await queryInterface.sequelize.query(
        'SELECT id FROM Organizers WHERE UserId IN (:userIds)',
        { replacements: { userIds: seededUserIds.length ? seededUserIds : [-1] }, transaction }
      );

      const seededOrganizerIds = seededOrganizers.map((organizer) => organizer.id);

      if (seededExperienceIds.length > 0 && seededUserIds.length > 0) {
        await queryInterface.bulkDelete('Comments', {
          CommentableType: 'Experience',
          CommentableId: {
            [Sequelize.Op.in]: seededExperienceIds
          },
          UserId: {
            [Sequelize.Op.in]: seededUserIds
          }
        }, { transaction });
      }

      if (seededOrganizerIds.length > 0 && seededUserIds.length > 0) {
        await queryInterface.bulkDelete('Comments', {
          CommentableType: 'Organizer',
          CommentableId: {
            [Sequelize.Op.in]: seededOrganizerIds
          },
          UserId: {
            [Sequelize.Op.in]: seededUserIds
          }
        }, { transaction });
      }

      if (seededExperienceIds.length > 0) {
        await queryInterface.bulkDelete('ScheduledExperiences', {
          ExperienceId: {
            [Sequelize.Op.in]: seededExperienceIds
          }
        }, { transaction });

        await queryInterface.bulkDelete('TicketTiers', {
          ExperienceId: {
            [Sequelize.Op.in]: seededExperienceIds
          }
        }, { transaction });

        await queryInterface.bulkDelete('ExperienceOrganizers', {
          ExperienceId: {
            [Sequelize.Op.in]: seededExperienceIds
          }
        }, { transaction });
      }

      if (seededOrganizationIds.length > 0 && seededUserIds.length > 0) {
        await queryInterface.bulkDelete('OrganizationMembers', {
          OrganizationId: {
            [Sequelize.Op.in]: seededOrganizationIds
          },
          UserId: {
            [Sequelize.Op.in]: seededUserIds
          }
        }, { transaction });
      }

      if (seededUserIds.length > 0) {
        await queryInterface.bulkDelete('Organizers', {
          UserId: {
            [Sequelize.Op.in]: seededUserIds
          }
        }, { transaction });
      }

      if (seededExperienceIds.length > 0) {
        await queryInterface.bulkDelete('Experiences', {
          id: {
            [Sequelize.Op.in]: seededExperienceIds
          }
        }, { transaction });
      }

      await queryInterface.bulkDelete('Users', {
        email: {
          [Sequelize.Op.in]: testUserEmails
        }
      }, { transaction });

      if (seededOrganizationIds.length > 0) {
        await queryInterface.bulkDelete('Organizations', {
          id: {
            [Sequelize.Op.in]: seededOrganizationIds
          }
        }, { transaction });
      }

      await queryInterface.bulkDelete('Locations', {
        name: {
          [Sequelize.Op.in]: testLocationNames
        }
      }, { transaction });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};
