#!/usr/bin/env node
// Generates upcoming sessions for every experience, the same work the scheduler cron performs.
// Seeders create experiences without sessions, so run this after seeding a fresh database.
import db from '../models/index.js';
import { syncExperienceSchedule } from '../services/Scheduler.service.js';

(async () => {
  try {
    const experiences = await db.Experience.findAll();
    for (const experience of experiences) {
      await syncExperienceSchedule(experience);
    }
    const sessions = await db.ScheduledExperience.count();
    console.log(`Synced schedules for ${experiences.length} experiences (${sessions} sessions total).`);
    process.exit(0);
  } catch (err) {
    console.error('Error syncing schedules:', err && err.stack ? err.stack : err);
    process.exit(1);
  }
})();
