import {
  createOrganizationLocationService,
  updateOrganizationLocationService,
  deleteOrganizationLocationService,
} from '../../server/services/Organizer.service.js';
import { Organization, Location, Experience, Service, sequelize } from '../../server/models/index.js';

describe('Organizer.service.createOrganizationLocationService', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('allows creating a new organization location even when another location with the same name already exists', async () => {
    jest.spyOn(sequelize.models.OrganizationMembers, 'findOne').mockResolvedValue({ id: 1 });
    jest.spyOn(Organization, 'findByPk').mockResolvedValue({ id: 123 });
    const findOneSpy = jest.spyOn(Location, 'findOne').mockResolvedValue({ id: 999, OrganizationId: 123, name: 'Duplicate Location' });
    const createSpy = jest.spyOn(Location, 'create').mockResolvedValue({ id: 456, name: 'Duplicate Location' });

    const result = await createOrganizationLocationService({
      userId: 1,
      organizationIdParam: '123',
      payload: {
        name: 'Duplicate Location',
        country: 'United States',
        state: 'California',
        city: 'San Francisco',
        street: '1 Market St',
        zipCode: '94105',
        latitude: 37.79,
        longitude: -122.39,
        timezone: 'America/Los_Angeles',
      },
    });

    expect(findOneSpy).not.toHaveBeenCalled();
    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Duplicate Location',
        OrganizationId: 123,
      })
    );
    expect(result.location).toEqual({ id: 456, name: 'Duplicate Location' });
  });
});

describe('Organizer.service.updateOrganizationLocationService', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('updates location name and city when authorized', async () => {
    jest.spyOn(sequelize.models.OrganizationMembers, 'findOne').mockResolvedValue({ id: 1 });
    const mockUpdate = jest.fn().mockResolvedValue(undefined);
    jest.spyOn(Location, 'findOne').mockResolvedValue({
      id: 10, OrganizationId: 5, name: 'Old Name', update: mockUpdate,
    });

    const result = await updateOrganizationLocationService({
      userId: 1,
      organizationIdParam: '5',
      locationIdParam: '10',
      payload: { name: 'New Name', city: 'Los Angeles' },
    });

    expect(mockUpdate).toHaveBeenCalledWith({ name: 'New Name', city: 'Los Angeles' });
    expect(result.location).toBeDefined();
  });

  test('rejects when user is not an admin', async () => {
    jest.spyOn(sequelize.models.OrganizationMembers, 'findOne').mockResolvedValue(null);

    await expect(
      updateOrganizationLocationService({
        userId: 1,
        organizationIdParam: '5',
        locationIdParam: '10',
        payload: { name: 'New Name' },
      })
    ).rejects.toEqual(expect.objectContaining({ status: 403 }));
  });

  test('rejects when location not found', async () => {
    jest.spyOn(sequelize.models.OrganizationMembers, 'findOne').mockResolvedValue({ id: 1 });
    jest.spyOn(Location, 'findOne').mockResolvedValue(null);

    await expect(
      updateOrganizationLocationService({
        userId: 1,
        organizationIdParam: '5',
        locationIdParam: '999',
        payload: { name: 'New Name' },
      })
    ).rejects.toEqual(expect.objectContaining({ status: 404 }));
  });
});

describe('Organizer.service.deleteOrganizationLocationService', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('deletes a location with no experiences or services', async () => {
    jest.spyOn(sequelize.models.OrganizationMembers, 'findOne').mockResolvedValue({ id: 1 });
    const mockDestroy = jest.fn().mockResolvedValue(undefined);
    jest.spyOn(Location, 'findOne').mockResolvedValue({ id: 10, OrganizationId: 5, destroy: mockDestroy });
    jest.spyOn(Experience, 'count').mockResolvedValue(0);
    jest.spyOn(Service, 'count').mockResolvedValue(0);
    jest.spyOn(Organization, 'findOne').mockResolvedValue(null);

    const result = await deleteOrganizationLocationService({
      userId: 1,
      organizationIdParam: '5',
      locationIdParam: '10',
    });

    expect(mockDestroy).toHaveBeenCalled();
    expect(result.deleted).toBe(true);
  });

  test('rejects deletion when location has experiences', async () => {
    jest.spyOn(sequelize.models.OrganizationMembers, 'findOne').mockResolvedValue({ id: 1 });
    jest.spyOn(Location, 'findOne').mockResolvedValue({ id: 10, OrganizationId: 5 });
    jest.spyOn(Experience, 'count').mockResolvedValue(2);
    jest.spyOn(Service, 'count').mockResolvedValue(0);

    await expect(
      deleteOrganizationLocationService({
        userId: 1,
        organizationIdParam: '5',
        locationIdParam: '10',
      })
    ).rejects.toEqual(expect.objectContaining({ status: 409 }));
  });

  test('rejects deletion when location is used as organization HQ', async () => {
    jest.spyOn(sequelize.models.OrganizationMembers, 'findOne').mockResolvedValue({ id: 1 });
    jest.spyOn(Location, 'findOne').mockResolvedValue({ id: 10, OrganizationId: 5 });
    jest.spyOn(Experience, 'count').mockResolvedValue(0);
    jest.spyOn(Service, 'count').mockResolvedValue(0);
    jest.spyOn(Organization, 'findOne').mockResolvedValue({ id: 5, LocationId: 10 });

    await expect(
      deleteOrganizationLocationService({
        userId: 1,
        organizationIdParam: '5',
        locationIdParam: '10',
      })
    ).rejects.toEqual(expect.objectContaining({ status: 409 }));
  });

  test('rejects when user is not an admin', async () => {
    jest.spyOn(sequelize.models.OrganizationMembers, 'findOne').mockResolvedValue(null);

    await expect(
      deleteOrganizationLocationService({
        userId: 1,
        organizationIdParam: '5',
        locationIdParam: '10',
      })
    ).rejects.toEqual(expect.objectContaining({ status: 403 }));
  });
});
