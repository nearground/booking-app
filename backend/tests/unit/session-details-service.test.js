/**
 * Unit tests for getSessionReservationsService and cancelSessionService
 * in Organizer.service.js
 *
 * Mocks all Sequelize models so no real DB connection is required.
 */

import {
    getSessionReservationsService,
    cancelSessionService,
} from '../../server/services/Organizer.service.js';
import {
    ScheduledExperience,
    ExperienceReservation,
    Experience,
    Organization,
    TicketTier,
    sequelize,
} from '../../server/models/index.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeScheduledExperience = (overrides = {}) => ({
    id: 1,
    dateTime: '2026-05-01T10:00:00Z',
    endDateTime: '2026-05-01T12:00:00Z',
    capacity: 20,
    availableSpots: 15,
    status: 'scheduled',
    Experience: {
        id: 100,
        title: 'Sierra Ridge Sunrise Hike',
        capacity: 20,
        duration: 120,
        OrganizationId: 10,
        Organization: { id: 10, name: 'Mountain Adventures' },
        TicketTiers: [
            { id: 1, title: 'Adult (Drinks Included)', price: 50 },
            { id: 2, title: 'Children', price: 25 },
        ],
    },
    update: jest.fn().mockResolvedValue(undefined),
    ...overrides,
});

const makeReservation = (overrides = {}) => ({
    id: 1,
    confirmationCode: 'EXP-20260501-0001',
    billingName: 'John Doe',
    dayOfPhone: '+1 (555) 123-4567',
    billingEmail: 'john@example.com',
    status: 'confirmed',
    numberOfAttendees: 3,
    totalPrice: '125.00',
    hotelName: 'Hilton Garden Inn',
    comments: 'Looking forward to it!',
    specialRequests: 'Vegetarian meals',
    createdAt: '2026-04-10T08:00:00Z',
    Attendees: [
        { id: 1, TicketTierId: 1, TicketTier: { id: 1, title: 'Adult (Drinks Included)', price: 50 } },
        { id: 2, TicketTierId: 2, TicketTier: { id: 2, title: 'Children', price: 25 } },
        { id: 3, TicketTierId: 2, TicketTier: { id: 2, title: 'Children', price: 25 } },
    ],
    ReservationAnswers: [
        { questionKey: 'where_will_you_be_staying', answerText: 'Hilton Garden Inn' },
    ],
    ...overrides,
});

// ---------------------------------------------------------------------------
// getSessionReservationsService
// ---------------------------------------------------------------------------

describe('Organizer.service.getSessionReservationsService', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('returns session details and reservations with ticket breakdown', async () => {
        const scheduledExp = makeScheduledExperience();
        jest.spyOn(ScheduledExperience, 'findByPk').mockResolvedValue(scheduledExp);
        jest.spyOn(sequelize.models.OrganizationMembers, 'findOne').mockResolvedValue({ id: 1 });
        jest.spyOn(ExperienceReservation, 'findAll').mockResolvedValue([makeReservation()]);

        const result = await getSessionReservationsService({ userId: 1, sessionId: '1' });

        expect(result.session).toEqual(expect.objectContaining({
            id: 1,
            experienceTitle: 'Sierra Ridge Sunrise Hike',
            organizationName: 'Mountain Adventures',
            capacity: 20,
            availableSpots: 15,
            status: 'scheduled',
        }));
        expect(result.session.ticketTiers).toHaveLength(2);
        expect(result.reservations).toHaveLength(1);

        const reservation = result.reservations[0];
        expect(reservation.billingName).toBe('John Doe');
        expect(reservation.dayOfPhone).toBe('+1 (555) 123-4567');
        expect(reservation.status).toBe('confirmed');
        expect(reservation.ticketBreakdown).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ tierName: 'Adult (Drinks Included)', count: 1 }),
                expect.objectContaining({ tierName: 'Children', count: 2 }),
            ])
        );
        expect(reservation.reservationAnswers).toEqual([
            { questionKey: 'where_will_you_be_staying', answerText: 'Hilton Garden Inn' },
        ]);

    });

    test('returns empty reservations array when none exist', async () => {
        jest.spyOn(ScheduledExperience, 'findByPk').mockResolvedValue(makeScheduledExperience());
        jest.spyOn(sequelize.models.OrganizationMembers, 'findOne').mockResolvedValue({ id: 1 });
        jest.spyOn(ExperienceReservation, 'findAll').mockResolvedValue([]);

        const result = await getSessionReservationsService({ userId: 1, sessionId: '1' });

        expect(result.reservations).toEqual([]);
        expect(result.session.experienceTitle).toBe('Sierra Ridge Sunrise Hike');
    });

    test('throws 400 for non-integer sessionId', async () => {
        await expect(
            getSessionReservationsService({ userId: 1, sessionId: 'abc' })
        ).rejects.toEqual({ status: 400, errors: ['Invalid session id'] });
    });

    test('throws 400 for float sessionId', async () => {
        await expect(
            getSessionReservationsService({ userId: 1, sessionId: '1.5' })
        ).rejects.toEqual({ status: 400, errors: ['Invalid session id'] });
    });

    test('throws 404 when session does not exist', async () => {
        jest.spyOn(ScheduledExperience, 'findByPk').mockResolvedValue(null);

        await expect(
            getSessionReservationsService({ userId: 1, sessionId: '999' })
        ).rejects.toEqual({ status: 404, errors: ['Session not found'] });
    });

    test('throws 404 when session has no Experience (OrganizationId missing)', async () => {
        jest.spyOn(ScheduledExperience, 'findByPk').mockResolvedValue({
            id: 1,
            Experience: null,
        });

        await expect(
            getSessionReservationsService({ userId: 1, sessionId: '1' })
        ).rejects.toEqual({ status: 404, errors: ['Session not found'] });
    });

    test('throws 404 when Experience has no OrganizationId', async () => {
        jest.spyOn(ScheduledExperience, 'findByPk').mockResolvedValue({
            id: 1,
            Experience: { id: 100, title: 'Test', OrganizationId: null },
        });

        await expect(
            getSessionReservationsService({ userId: 1, sessionId: '1' })
        ).rejects.toEqual({ status: 404, errors: ['Session not found'] });
    });

    test('throws 403 when user is not a member of the organization', async () => {
        jest.spyOn(ScheduledExperience, 'findByPk').mockResolvedValue(makeScheduledExperience());
        jest.spyOn(sequelize.models.OrganizationMembers, 'findOne').mockResolvedValue(null);

        await expect(
            getSessionReservationsService({ userId: 99, sessionId: '1' })
        ).rejects.toEqual({ status: 403, errors: ['You do not have access to this session'] });
    });

    test('handles reservations with no attendees gracefully', async () => {
        const reservation = makeReservation({ Attendees: [] });
        jest.spyOn(ScheduledExperience, 'findByPk').mockResolvedValue(makeScheduledExperience());
        jest.spyOn(sequelize.models.OrganizationMembers, 'findOne').mockResolvedValue({ id: 1 });
        jest.spyOn(ExperienceReservation, 'findAll').mockResolvedValue([reservation]);

        const result = await getSessionReservationsService({ userId: 1, sessionId: '1' });

        expect(result.reservations[0].ticketBreakdown).toEqual([]);
    });

    test('handles attendees with no TicketTier (null tier)', async () => {
        const reservation = makeReservation({
            Attendees: [
                { id: 1, TicketTierId: null, TicketTier: null },
                { id: 2, TicketTierId: null, TicketTier: null },
            ],
        });
        jest.spyOn(ScheduledExperience, 'findByPk').mockResolvedValue(makeScheduledExperience());
        jest.spyOn(sequelize.models.OrganizationMembers, 'findOne').mockResolvedValue({ id: 1 });
        jest.spyOn(ExperienceReservation, 'findAll').mockResolvedValue([reservation]);

        const result = await getSessionReservationsService({ userId: 1, sessionId: '1' });

        expect(result.reservations[0].ticketBreakdown).toEqual([
            expect.objectContaining({ tierName: 'General', count: 2 }),
        ]);
    });

    test('returns multiple reservations sorted by createdAt DESC', async () => {
        const reservation1 = makeReservation({
            id: 1,
            billingName: 'Alice',
            createdAt: '2026-04-08T10:00:00Z',
            Attendees: [],
        });
        const reservation2 = makeReservation({
            id: 2,
            billingName: 'Bob',
            createdAt: '2026-04-10T10:00:00Z',
            Attendees: [],
        });
        jest.spyOn(ScheduledExperience, 'findByPk').mockResolvedValue(makeScheduledExperience());
        jest.spyOn(sequelize.models.OrganizationMembers, 'findOne').mockResolvedValue({ id: 1 });
        // The mock returns them in the order provided; the service delegates sorting to the DB
        jest.spyOn(ExperienceReservation, 'findAll').mockResolvedValue([reservation2, reservation1]);

        const result = await getSessionReservationsService({ userId: 1, sessionId: '1' });

        expect(result.reservations).toHaveLength(2);
        expect(result.reservations[0].billingName).toBe('Bob');
        expect(result.reservations[1].billingName).toBe('Alice');
    });

    test('serializes all reservation fields correctly', async () => {
        const reservation = makeReservation();
        jest.spyOn(ScheduledExperience, 'findByPk').mockResolvedValue(makeScheduledExperience());
        jest.spyOn(sequelize.models.OrganizationMembers, 'findOne').mockResolvedValue({ id: 1 });
        jest.spyOn(ExperienceReservation, 'findAll').mockResolvedValue([reservation]);

        const result = await getSessionReservationsService({ userId: 1, sessionId: '1' });
        const r = result.reservations[0];

        expect(r).toEqual(expect.objectContaining({
            id: 1,
            confirmationCode: 'EXP-20260501-0001',
            billingName: 'John Doe',
            dayOfPhone: '+1 (555) 123-4567',
            billingEmail: 'john@example.com',
            status: 'confirmed',
            numberOfAttendees: 3,
            totalPrice: '125.00',
            hotelName: 'Hilton Garden Inn',
            comments: 'Looking forward to it!',
            specialRequests: 'Vegetarian meals',
        }));
    });

    test('accepts numeric sessionId as number type', async () => {
        jest.spyOn(ScheduledExperience, 'findByPk').mockResolvedValue(makeScheduledExperience());
        jest.spyOn(sequelize.models.OrganizationMembers, 'findOne').mockResolvedValue({ id: 1 });
        jest.spyOn(ExperienceReservation, 'findAll').mockResolvedValue([]);

        const result = await getSessionReservationsService({ userId: 1, sessionId: 1 });

        expect(result.session.id).toBe(1);
    });

    test('session object includes endDateTime and experienceDuration', async () => {
        jest.spyOn(ScheduledExperience, 'findByPk').mockResolvedValue(makeScheduledExperience());
        jest.spyOn(sequelize.models.OrganizationMembers, 'findOne').mockResolvedValue({ id: 1 });
        jest.spyOn(ExperienceReservation, 'findAll').mockResolvedValue([]);

        const result = await getSessionReservationsService({ userId: 1, sessionId: '1' });

        expect(result.session.endDateTime).toBe('2026-05-01T12:00:00Z');
        expect(result.session.experienceDuration).toBe(120);
    });
});

// ---------------------------------------------------------------------------
// cancelSessionService
// ---------------------------------------------------------------------------

describe('Organizer.service.cancelSessionService', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    const makeTx = () => ({
        commit: jest.fn().mockResolvedValue(undefined),
        rollback: jest.fn().mockResolvedValue(undefined),
    });

    test('cancels a session and its active reservations', async () => {
        const tx = makeTx();
        const scheduledExp = makeScheduledExperience();
        const reservation1 = { id: 1, status: 'confirmed', update: jest.fn().mockResolvedValue(undefined) };
        const reservation2 = { id: 2, status: 'pending', update: jest.fn().mockResolvedValue(undefined) };

        jest.spyOn(ScheduledExperience, 'findByPk').mockResolvedValue(scheduledExp);
        jest.spyOn(sequelize.models.OrganizationMembers, 'findOne').mockResolvedValue({ id: 1, isAdmin: true });
        jest.spyOn(sequelize, 'transaction').mockResolvedValue(tx);
        jest.spyOn(ExperienceReservation, 'findAll').mockResolvedValue([reservation1, reservation2]);

        const result = await cancelSessionService({ userId: 1, sessionId: '1' });

        expect(scheduledExp.update).toHaveBeenCalledWith(
            { status: 'cancelled' },
            { transaction: tx }
        );
        expect(reservation1.update).toHaveBeenCalledWith(
            { status: 'cancelled' },
            { transaction: tx }
        );
        expect(reservation2.update).toHaveBeenCalledWith(
            { status: 'cancelled' },
            { transaction: tx }
        );
        expect(tx.commit).toHaveBeenCalled();
        expect(tx.rollback).not.toHaveBeenCalled();
        expect(result.session).toBe(scheduledExp);
    });

    test('cancels session with no reservations', async () => {
        const tx = makeTx();
        const scheduledExp = makeScheduledExperience();

        jest.spyOn(ScheduledExperience, 'findByPk').mockResolvedValue(scheduledExp);
        jest.spyOn(sequelize.models.OrganizationMembers, 'findOne').mockResolvedValue({ id: 1, isAdmin: true });
        jest.spyOn(sequelize, 'transaction').mockResolvedValue(tx);
        jest.spyOn(ExperienceReservation, 'findAll').mockResolvedValue([]);

        const result = await cancelSessionService({ userId: 1, sessionId: '1' });

        expect(scheduledExp.update).toHaveBeenCalledWith(
            { status: 'cancelled' },
            { transaction: tx }
        );
        expect(tx.commit).toHaveBeenCalled();
        expect(result.session).toBe(scheduledExp);
    });

    test('throws 400 for non-integer sessionId', async () => {
        await expect(
            cancelSessionService({ userId: 1, sessionId: 'abc' })
        ).rejects.toEqual({ status: 400, errors: ['Invalid session id'] });
    });

    test('throws 404 when session does not exist', async () => {
        jest.spyOn(ScheduledExperience, 'findByPk').mockResolvedValue(null);

        await expect(
            cancelSessionService({ userId: 1, sessionId: '999' })
        ).rejects.toEqual({ status: 404, errors: ['Session not found'] });
    });

    test('throws 404 when session has no Experience', async () => {
        jest.spyOn(ScheduledExperience, 'findByPk').mockResolvedValue({
            id: 1,
            Experience: null,
        });

        await expect(
            cancelSessionService({ userId: 1, sessionId: '1' })
        ).rejects.toEqual({ status: 404, errors: ['Session not found'] });
    });

    test('throws 403 when user is not an admin', async () => {
        jest.spyOn(ScheduledExperience, 'findByPk').mockResolvedValue(makeScheduledExperience());
        jest.spyOn(sequelize.models.OrganizationMembers, 'findOne').mockResolvedValue(null);

        await expect(
            cancelSessionService({ userId: 99, sessionId: '1' })
        ).rejects.toEqual({ status: 403, errors: ['Only organization admins can cancel sessions'] });
    });

    test('throws 400 when session is already cancelled', async () => {
        const scheduledExp = makeScheduledExperience({ status: 'cancelled' });
        jest.spyOn(ScheduledExperience, 'findByPk').mockResolvedValue(scheduledExp);
        jest.spyOn(sequelize.models.OrganizationMembers, 'findOne').mockResolvedValue({ id: 1, isAdmin: true });

        await expect(
            cancelSessionService({ userId: 1, sessionId: '1' })
        ).rejects.toEqual({ status: 400, errors: ['Session is already cancelled'] });
    });

    test('rolls back transaction on error', async () => {
        const tx = makeTx();
        const scheduledExp = makeScheduledExperience();
        scheduledExp.update = jest.fn().mockRejectedValue(new Error('DB error'));

        jest.spyOn(ScheduledExperience, 'findByPk').mockResolvedValue(scheduledExp);
        jest.spyOn(sequelize.models.OrganizationMembers, 'findOne').mockResolvedValue({ id: 1, isAdmin: true });
        jest.spyOn(sequelize, 'transaction').mockResolvedValue(tx);

        await expect(
            cancelSessionService({ userId: 1, sessionId: '1' })
        ).rejects.toThrow('DB error');

        expect(tx.rollback).toHaveBeenCalled();
        expect(tx.commit).not.toHaveBeenCalled();
    });
});
