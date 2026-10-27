#!/usr/bin/env node
import { Experience } from '../models/index.js';
import { syncExperienceSchedule } from '../services/Scheduler.service.js';

(async () => {
  try {
    const title = 'Sierra Ridge Sunrise Hike';
    const exp = await Experience.findOne({ where: { title } });
    if (!exp) {
      console.error('Experience not found:', title);
      process.exit(2);
    }

    console.log('Found experience:', { id: exp.id, title: exp.title });

    const created = await syncExperienceSchedule(exp);
    console.log('syncExperienceSchedule returned count:', Array.isArray(created) ? created.length : 0);

    if (Array.isArray(created) && created.length > 0) {
      created.forEach((row, idx) => {
        try {
          const id = row.id || (typeof row.get === 'function' ? row.get('id') : undefined);
          const dt = row.dateTime || (typeof row.get === 'function' ? row.get('dateTime') : undefined);
          console.log(`#${idx + 1}: id=${id} dateTime=${dt}`);
        } catch (e) {
          console.log(`#${idx + 1}:`, row);
        }
      });
    }

    process.exit(0);
  } catch (err) {
    console.error('Error running smoke sync:', err && err.stack ? err.stack : err);
    process.exit(1);
  }
})();
