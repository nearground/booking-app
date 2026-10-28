import Sequelize from 'sequelize';
import { describe, expect, jest, test } from '@jest/globals';

jest.mock('../../server/seed-factory/showcase-media.js', () => ({
  prepareShowcaseMedia: jest.fn().mockResolvedValue({
    partyImages: ['users/1/experience-gallery/party.jpg'],
    foodImages: ['users/2/experience-gallery/food.jpg'],
    defaultImages: ['users/3/experience-gallery/coast.jpg', 'users/3/experience-gallery/bay.jpg'],
    heroVideo: 'users/2/asset/tacos.mp4',
    heroPoster: 'users/2/asset/tacos.jpg',
  }),
}));

const seeder = jest.requireActual('../../server/seeders/20260214193720-demo-experiences.js');

const runSeeder = async () => {
  const tables = {};
  const updates = [];
  const queryInterface = {
    bulkInsert: jest.fn(async (table, rows) => {
      const current = tables[table] || [];
      tables[table] = [...current, ...rows.map((row, index) => ({ id: current.length + index + 1, ...row }))];
    }),
    bulkDelete: jest.fn(),
    bulkUpdate: jest.fn(async (table, values, where) => {
      updates.push({ table, values, where });
    }),
    sequelize: { query: jest.fn(async (sql) => {
      if (sql.includes("WHERE name LIKE 'Test Location %'")) return [tables.Locations || [], {}];
      if (sql.includes("WHERE name LIKE 'Test Company %'")) return [tables.Organizations || [], {}];
      if (sql.includes("WHERE email LIKE 'user%@test.com'")) return [(tables.Users || []).filter((row) => row.email.startsWith('user')), {}];
      if (sql.includes('FROM OrganizationMembers')) return [tables.OrganizationMembers || [], {}];
      if (sql.includes('FROM Users WHERE id IN')) return [tables.Users || [], {}];
      if (sql.includes('FROM Experiences WHERE title IN') && sql.startsWith('SELECT id,')) return [tables.Experiences || [], {}];
      if (sql.includes('FROM Experiences WHERE id IN')) return [tables.Experiences || [], {}];
      if (sql.includes('FROM ScheduleTemplates')) return [tables.ScheduleTemplates || [], {}];
      if (sql.includes('FROM PickedOccurrences')) return [tables.PickedOccurrences || [], {}];
      if (sql.includes('FROM ScheduledExperiences')) return [(tables.ScheduledExperiences || []).filter((row) => [1, 2].includes(row.ExperienceId)), {}];
      if (sql.includes('FROM ExperienceReservations')) return [tables.ExperienceReservations || [], {}];
      if (sql.includes('FROM Organizers')) return [tables.Organizers || [], {}];
      if (sql.includes('FROM Comments')) return [(tables.Comments || []).filter((row) => row.CommentableType === 'Experience' && row.CommentableId === 4 && row.stars === 5 && [1, 2, 3].includes(row.UserId)).slice(0, 3), {}];
      return [[], {}];
    }) },
  };
  await seeder.up(queryInterface, Sequelize);
  return { tables, updates, queryInterface };
};

describe('experience showcase demo graph', () => {
  test('seeds three distinct organization preferences with uploaded media', async () => {
    const { tables, updates, queryInterface } = await runSeeder();
    const [party, secondParty, coastal, food] = tables.Experiences;
    expect(tables.Organizations.map((organization) => organization.font)).toEqual(['inter', 'lato', 'system']);
    expect(party.OrganizationId).toBe(1);
    expect(secondParty.OrganizationId).toBe(1);
    expect(coastal.OrganizationId).toBe(3);
    expect(food.OrganizationId).toBe(2);
    expect(queryInterface.bulkDelete).toHaveBeenCalledWith(
      'ExperienceOrganizers', { ExperienceId: { [Sequelize.Op.in]: [1, 2, 3, 4] } }, {},
    );
    for (const experience of tables.Experiences) {
      const hosts = tables.ExperienceOrganizers.filter((host) => host.ExperienceId === experience.id);
      expect(hosts).toHaveLength(2);
      for (const host of hosts) {
        expect(tables.OrganizationMembers).toContainEqual(expect.objectContaining({
          UserId: host.UserId, OrganizationId: experience.OrganizationId,
        }));
      }
    }
    expect(JSON.parse(party.detailsMetadata).template).toBe('party');
    expect(JSON.parse(coastal.detailsMetadata)).toEqual({ version: 1, template: 'default', overrides: {} });
    expect(JSON.parse(coastal.images)).toHaveLength(2);
    for (const experience of tables.Experiences) {
      expect(JSON.parse(experience.images).every((key) => key.startsWith('users/'))).toBe(true);
    }
    const foodUpdate = updates.find((update) => update.table === 'Experiences' && update.where.id === food.id);
    const metadata = JSON.parse(foodUpdate.values.detailsMetadata);
    expect(metadata.overrides.heroVideoKey).toBe('users/2/asset/tacos.mp4');
    expect(metadata.overrides.pinnedCommentIds).toHaveLength(3);
    for (const id of metadata.overrides.pinnedCommentIds) {
      const review = tables.Comments.find((row) => row.id === id);
      expect(review.stars).toBe(5);
      expect(review.CommentableId).toBe(food.id);
    }
  });

  test('party events have exactly one session, free tickets and consenting registered check-ins', async () => {
    const { tables, updates, queryInterface } = await runSeeder();
    for (const experience of tables.Experiences.slice(0, 2)) {
      expect(experience.autoSyncEnabled).toBe(false);
      const sessions = tables.ScheduledExperiences.filter((row) => row.ExperienceId === experience.id);
      expect(sessions).toHaveLength(1);
      expect(new Intl.DateTimeFormat('en-GB', {
        timeZone: 'America/Mexico_City', hour: '2-digit', hour12: false,
      }).format(sessions[0].dateTime)).toBe('20');
      expect(tables.ScheduleTemplates.filter((row) => row.ExperienceId === experience.id)).toHaveLength(0);
      expect(tables.TicketTiers.filter((row) => row.ExperienceId === experience.id).map((tier) => tier.price)).toEqual([0]);
      expect(JSON.parse(experience.userQuestionnary)).toContainEqual(expect.objectContaining({ questionKey: 'publicAttendance', type: 'boolean', required: false }));
      const reservations = tables.ExperienceReservations.filter((row) => row.ScheduledExperienceId === sessions[0].id);
      expect(reservations).toHaveLength(3);
      expect(reservations.every((row) => row.status === 'attended' && row.totalPrice === 0)).toBe(true);
      expect(updates).toContainEqual(expect.objectContaining({
        table: 'ScheduledExperiences', where: { id: sessions[0].id }, values: { availableSpots: experience.capacity - 3 },
      }));
    }
    expect(tables.ExperienceReservationAnswers).toHaveLength(6);
    expect(tables.ExperienceReservationAnswers.every((answer) => answer.questionKey === 'publicAttendance' && answer.answerText === 'true')).toBe(true);
    expect(queryInterface.bulkDelete).toHaveBeenCalledWith('ExperienceReservations', expect.objectContaining({ confirmationCode: expect.any(Object) }), {});
  });
});
