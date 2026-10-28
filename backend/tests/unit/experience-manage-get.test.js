/**
 * Unit tests for getExperienceForEdit in ExperienceManage.controller.js
 */

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockFindByPk = jest.fn();
const mockFindOne = jest.fn();

jest.mock('../../server/models/index.js', () => {
  const mockExperience = { findByPk: (...args) => mockFindByPk(...args) };
  const mockOrganizationMembers = { findOne: (...args) => mockFindOne(...args) };

  return {
    __esModule: true,
    Experience: mockExperience,
    Location: {},
    Organization: {},
    TicketTier: {},
    User: {},
    ScheduledExperience: {},
    ExperienceReservation: {},
    Comment: {},
    sequelize: {
      models: {
        OrganizationMembers: mockOrganizationMembers,
        ScheduleTemplate: {},
        PickedOccurrence: {},
      },
      transaction: jest.fn(async () => ({
        rollback: jest.fn(),
        commit: jest.fn(),
      })),
    },
    default: {
      Experience: mockExperience,
      Location: {},
      Organization: {},
      TicketTier: {},
      User: {},
      ScheduledExperience: {},
      ExperienceReservation: {},
      Comment: {},
      sequelize: {
        models: {
          OrganizationMembers: mockOrganizationMembers,
          ScheduleTemplate: {},
          PickedOccurrence: {},
        },
        transaction: jest.fn(async () => ({
          rollback: jest.fn(),
          commit: jest.fn(),
        })),
      },
    },
  };
});

jest.mock('../../server/services/Scheduler.service.js', () => ({
  __esModule: true,
  syncExperienceSchedule: jest.fn(),
  populateScheduleBounded: jest.fn(),
  previewStartDateUpdate: jest.fn(),
  confirmStartDateUpdate: jest.fn(),
}));

jest.mock('../../server/utils/cache.js', () => ({
  __esModule: true,
  default: { get: jest.fn(), set: jest.fn(), del: jest.fn(), delByPrefix: jest.fn() },
}));

jest.mock('../../server/utils/http-response.js', () => ({
  __esModule: true,
  sendError: jest.fn((res, { status, message }) => res.status(status).json({ errors: [message], data: {} })),
}));

jest.mock('../../server/controllers/offering-manage.shared.js', () => ({
  __esModule: true,
  normalizeBaseCreatePayload: jest.fn(() => ({ errors: [], createPayload: {} })),
  normalizeBaseUpdatePayload: jest.fn(() => ({ errors: [], updatePayload: {} })),
  createAssignOrganizersHandler: jest.fn(() => jest.fn()),
  createSyncManagedScheduleHandler: jest.fn(() => jest.fn()),
  normalizeSchedules: jest.fn(() => ({ templates: [], picks: [], errors: [] })),
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('getExperienceForEdit', () => {
  let getExperienceForEdit;

  beforeAll(async () => {
    const ctrl = await import('../../server/controllers/ExperienceManage.controller.js');
    getExperienceForEdit = ctrl.getExperienceForEdit;
  });

  describe('details metadata management writes', () => {
    beforeEach(() => jest.clearAllMocks());

    test('rejects unsafe metadata on create before writing', async () => {
      const { createExperience } = await import('../../server/controllers/ExperienceManage.controller.js');
      const res = mockRes();
      await createExperience({ body: { detailsMetadata: { version: 1, template: 'party', overrides: { css: 'bad' } } } }, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('rejects unauthorized updates before metadata persistence', async () => {
      const { updateExperience } = await import('../../server/controllers/ExperienceManage.controller.js');
      const record = { id: 10, OrganizationId: 3, update: jest.fn() };
      mockFindByPk.mockResolvedValue(record);
      mockFindOne.mockResolvedValue(null);
      const res = mockRes();
      await updateExperience({ params: { experienceId: '10' }, user: { id: 7 }, body: {
        detailsMetadata: { version: 1, template: 'party', overrides: {} },
      } }, res);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(record.update).not.toHaveBeenCalled();
    });

    test('persists and returns valid metadata for an authorized update', async () => {
      const { updateExperience } = await import('../../server/controllers/ExperienceManage.controller.js');
      const metadata = { version: 1, template: 'food-tour', overrides: { pinnedCommentIds: [9, 8, 7] } };
      const record = { id: 10, OrganizationId: 3 };
      record.update = jest.fn(async (payload) => Object.assign(record, payload));
      mockFindByPk.mockResolvedValue(record);
      mockFindOne.mockResolvedValue({ isAdmin: true });
      const res = mockRes();
      await updateExperience({ params: { experienceId: '10' }, user: { id: 1 }, body: { detailsMetadata: metadata } }, res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(record.update).toHaveBeenCalledWith({ detailsMetadata: metadata }, expect.any(Object));
      expect(res.json.mock.calls[0][0].data.experience.detailsMetadata).toEqual(metadata);
    });

    test('omitted metadata leaves the existing template untouched', async () => {
      const { updateExperience } = await import('../../server/controllers/ExperienceManage.controller.js');
      const metadata = { version: 1, template: 'party', overrides: {} };
      const record = { id: 10, OrganizationId: 3, detailsMetadata: metadata };
      record.update = jest.fn(async (payload) => Object.assign(record, payload));
      mockFindByPk.mockResolvedValue(record);
      mockFindOne.mockResolvedValue({ isAdmin: true });
      const res = mockRes();
      await updateExperience({ params: { experienceId: '10' }, user: { id: 1 }, body: {} }, res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(record.update).toHaveBeenCalledWith({}, expect.any(Object));
      expect(record.detailsMetadata).toEqual(metadata);
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns 400 for a non-integer experienceId', async () => {
    const req = { params: { experienceId: 'abc' }, user: { id: 1 } };
    const res = mockRes();

    await getExperienceForEdit(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ errors: expect.arrayContaining(['Invalid experience id']) }));
  });

  test('returns 404 when experience does not exist', async () => {
    const req = { params: { experienceId: '99' }, user: { id: 1 } };
    const res = mockRes();

    mockFindByPk.mockResolvedValue(null);

    await getExperienceForEdit(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  test('returns 403 when user is not an admin of the experience organization', async () => {
    const req = { params: { experienceId: '10' }, user: { id: 7 } };
    const res = mockRes();

    mockFindByPk.mockResolvedValue({
      id: 10,
      title: 'Test Experience',
      OrganizationId: 3,
      LocationId: 5,
      capacity: 15,
      duration: 60,
      userQuestionnary: [],
      thumbnail: null,
      subtitle: null,
      description: null,
      TicketTiers: [],
      ScheduleTemplates: [],
      PickedOccurrences: [],
      Organizers: [],
    });

    mockFindOne.mockResolvedValue(null); // no admin membership

    await getExperienceForEdit(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  test('returns 200 with full experience data for an admin user', async () => {
    const req = { params: { experienceId: '10' }, user: { id: 1 } };
    const res = mockRes();

    const experienceRecord = {
      id: 10,
      title: 'Mountain Hike',
      subtitle: 'Great views',
      description: 'Amazing trail.',
      detailsMetadata: { version: 1, template: 'food-tour', overrides: { pinnedCommentIds: [3, 2, 1] } },
      thumbnail: 'key/thumbnail.jpg',
      capacity: 20,
      duration: 180,
      OrganizationId: 3,
      LocationId: 5,
      userQuestionnary: [{ questionKey: 'age', prompt: 'Your age?', required: true }],
      Location: { id: 5, name: 'Trailhead', city: 'Denver', state: 'CO', country: 'US', street: '123 Trail Rd', zipCode: '80202', timezone: 'America/Denver', coordinates: {} },
      TicketTiers: [
        { id: 1, title: 'Adult', price: 50, description: 'Standard', minAge: 18, maxAge: null, userQuestionnary: [] },
      ],
      ScheduleTemplates: [
        { id: 100, name: null, ruleType: 'cron', ruleCron: '0 9 * * 6', ruleDateTime: null, timezone: 'America/Denver', durationMinutes: null, capacity: null },
      ],
      PickedOccurrences: [],
      Organizers: [{ id: 1, firstName: 'Alice', lastName: 'Admin', profilePicture: '', email: 'alice@example.com' }],
    };

    mockFindByPk.mockResolvedValue(experienceRecord);
    mockFindOne.mockResolvedValue({ id: 1, isAdmin: true }); // admin membership found

    await getExperienceForEdit(req, res);

    expect(res.status).toHaveBeenCalledWith(200);

    const responseData = res.json.mock.calls[0][0];
    expect(responseData.errors).toEqual([]);
    expect(responseData.data.experience.id).toBe(10);
    expect(responseData.data.experience.title).toBe('Mountain Hike');
    expect(responseData.data.experience.detailsMetadata).toEqual(experienceRecord.detailsMetadata);
    expect(responseData.data.experience.ScheduleTemplates).toHaveLength(1);
    expect(responseData.data.experience.ScheduleTemplates[0].ruleCron).toBe('0 9 * * 6');
    expect(responseData.data.experience.TicketTiers).toHaveLength(1);
    expect(responseData.data.experience.TicketTiers[0].title).toBe('Adult');
    expect(responseData.data.experience.Organizers).toHaveLength(1);
  });
});
