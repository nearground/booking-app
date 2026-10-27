import mysql from 'mysql2/promise';

(async () => {
  try {
    const host = process.env.DEV_DB_HOST || process.env.DB_HOST || 'database';
    const user = process.env.DEV_DB_USER || process.env.MYSQL_USER || 'staybooker';
    const password = process.env.DEV_DB_PASS || process.env.MYSQL_PASSWORD || process.env.MYSQL_PASSWORD || 'password123';
    const database = process.env.DEV_DB_NAME || process.env.MYSQL_DATABASE || 'staybooker';

    console.log('Connecting to', { host, user, database });
    const conn = await mysql.createConnection({ host, user, password, database });

    const [locations] = await conn.execute("SELECT id, name, timezone FROM Locations WHERE name LIKE 'Test Location %';");
    console.log('\nLocations:');
    locations.forEach((r) => console.log(r));

    const [templates] = await conn.execute("SELECT id, ExperienceId, name, timezone, ruleCron FROM ScheduleTemplates WHERE name LIKE '%template' ORDER BY ExperienceId;");
    console.log('\nScheduleTemplates:');
    templates.forEach((t) => console.log(t));
    
    const [scheduled] = await conn.execute("SELECT id, ExperienceId, dateTime, endDateTime, status FROM ScheduledExperiences WHERE ExperienceId IN (1,2,3,4) ORDER BY dateTime LIMIT 10;");
    console.log('\nScheduledExperiences (sample):');
    scheduled.forEach((s) => console.log(s));
    await conn.end();
    process.exit(0);
  } catch (err) {
    console.error('DB check error:', err && err.stack ? err.stack : err);
    process.exit(1);
  }
})();
