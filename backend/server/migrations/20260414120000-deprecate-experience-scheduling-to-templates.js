'use strict';

/**
 * Migration: Deprecate Experience.scheduling → ScheduleTemplate
 *
 * Converts existing Experience.scheduling cron values into ScheduleTemplate records.
 * The scheduling column is NOT dropped — it is left in place for rollback compatibility.
 * After migration, existing cron values are nulled out on the Experience rows.
 *
 * Idempotent: skips experiences that already have a matching ScheduleTemplate.
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Find all experiences with a non-null scheduling cron value
    const [experiences] = await queryInterface.sequelize.query(
      `SELECT e.id, e.title, e.scheduling, e.duration, e.capacity, e.LocationId
       FROM Experiences e
       WHERE e.scheduling IS NOT NULL AND e.scheduling != ''`
    );

    if (experiences.length === 0) return;

    // Look up timezones from locations
    const locationIds = [...new Set(experiences.map((e) => e.LocationId).filter(Boolean))];
    let timezoneMap = {};
    if (locationIds.length > 0) {
      const [locations] = await queryInterface.sequelize.query(
        `SELECT id, timezone FROM Locations WHERE id IN (:locationIds)`,
        { replacements: { locationIds } }
      );
      timezoneMap = locations.reduce((acc, loc) => {
        acc[loc.id] = loc.timezone || 'UTC';
        return acc;
      }, {});
    }

    // Check which experiences already have a ScheduleTemplate (idempotency)
    const experienceIds = experiences.map((e) => e.id);
    const [existingTemplates] = await queryInterface.sequelize.query(
      `SELECT ExperienceId, ruleCron FROM ScheduleTemplates WHERE ExperienceId IN (:experienceIds)`,
      { replacements: { experienceIds } }
    );

    const existingTemplateKeys = new Set(
      existingTemplates.map((t) => `${t.ExperienceId}::${t.ruleCron}`)
    );

    const templatesToInsert = [];
    const experienceIdsToNull = [];

    for (const experience of experiences) {
      const key = `${experience.id}::${experience.scheduling}`;
      if (existingTemplateKeys.has(key)) {
        // Template already exists for this cron — just null out the experience scheduling
        experienceIdsToNull.push(experience.id);
        continue;
      }

      const timezone = timezoneMap[experience.LocationId] || 'UTC';

      templatesToInsert.push({
        ExperienceId: experience.id,
        name: `${experience.title} — Recurring Schedule`,
        type: 'recurring',
        ruleType: 'cron',
        ruleCron: experience.scheduling,
        timezone,
        durationMinutes: experience.duration || null,
        capacity: experience.capacity || null,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      experienceIdsToNull.push(experience.id);
    }

    if (templatesToInsert.length > 0) {
      await queryInterface.bulkInsert('ScheduleTemplates', templatesToInsert, {});
    }

    // Null out the deprecated scheduling column
    if (experienceIdsToNull.length > 0) {
      await queryInterface.sequelize.query(
        `UPDATE Experiences SET scheduling = NULL WHERE id IN (:ids)`,
        { replacements: { ids: experienceIdsToNull } }
      );
    }
  },

  async down(queryInterface, Sequelize) {
    // Restore scheduling values from ScheduleTemplates created by this migration
    const [templates] = await queryInterface.sequelize.query(
      `SELECT st.ExperienceId, st.ruleCron
       FROM ScheduleTemplates st
       INNER JOIN Experiences e ON e.id = st.ExperienceId
       WHERE e.scheduling IS NULL AND st.ruleType = 'cron' AND st.ruleCron IS NOT NULL
       AND st.name LIKE '% — Recurring Schedule'`
    );

    for (const template of templates) {
      await queryInterface.sequelize.query(
        `UPDATE Experiences SET scheduling = :cron WHERE id = :id`,
        { replacements: { cron: template.ruleCron, id: template.ExperienceId } }
      );
    }

    // Remove templates created by this migration
    await queryInterface.sequelize.query(
      `DELETE FROM ScheduleTemplates WHERE name LIKE '% — Recurring Schedule'`
    );
  },
};
