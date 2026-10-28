import {
    ScheduledExperience,
    ExperienceReservation,
    ExperienceReservationAnswer,
    User,
} from '../models/index.js';
import { resolveMediaUrl } from '../utils/media-storage.js';

export const getPartyAttendance = async ({ experienceCode }) => {
    if (!/^[1-9]\d*$/.test(String(experienceCode))) {
        return { status: 400, errors: ['Invalid experience'], data: null };
    }
    const sessions = await ScheduledExperience.findAll({
        where: {
            ExperienceId: experienceCode,
            status: ['scheduled', 'in-progress', 'completed', 'waitlisted'],
        },
        attributes: [
            'id',
            'dateTime',
            'endDateTime',
            'availableSpots',
            'status',
        ],
        order: [['dateTime', 'ASC']],
        limit: 2,
    });
    if (sessions.length !== 1) {
        return {
            status: 409,
            errors: ['This party needs exactly one event date'],
            data: null,
        };
    }
    const session = sessions[0];
    const result = await getPublicExperienceAttendance({
        experienceCode,
        sessionId: session.id,
    });
    if (result.status !== 200) return result;
    return { ...result, data: { ...result.data, session } };
};

export const getPublicExperienceAttendance = async ({
    experienceCode,
    sessionId,
}) => {
    if (
        !/^[1-9]\d*$/.test(String(experienceCode)) ||
        !/^[1-9]\d*$/.test(String(sessionId))
    ) {
        return {
            status: 400,
            errors: ['Invalid experience or session'],
            data: null,
        };
    }

    const session = await ScheduledExperience.findOne({
        where: { id: sessionId, ExperienceId: experienceCode },
        attributes: ['id', 'status'],
    });
    if (!session || session.status === 'cancelled') {
        return { status: 404, errors: ['Session not found'], data: null };
    }

    // "attended" is the existing reservation-level check-in state, not a booking count.
    const where = { ScheduledExperienceId: session.id, status: 'attended' };
    const checkedInCount =
        Number(
            await ExperienceReservation.sum('numberOfAttendees', { where })
        ) || 0;
    const reservations = await ExperienceReservation.findAll({
        where,
        attributes: ['CustomerId'],
        include: [
            {
                model: User,
                as: 'Customer',
                attributes: ['id', 'firstName', 'lastName', 'profilePicture'],
                where: { isRegistered: true },
                required: true,
            },
            {
                model: ExperienceReservationAnswer,
                as: 'ReservationAnswers',
                attributes: [],
                where: { questionKey: 'publicAttendance', answerText: 'true' },
                required: true,
            },
        ],
        order: [['CustomerId', 'ASC']],
        limit: 50,
    });

    const seen = new Set();
    const attendees = [];
    for (const reservation of reservations) {
        const user = reservation.Customer;
        if (!user || seen.has(user.id)) continue;
        seen.add(user.id);
        const name = [user.firstName, user.lastName]
            .filter(Boolean)
            .join(' ')
            .trim();
        if (!name) continue;
        attendees.push({ name, avatar: resolveMediaUrl(user.profilePicture) });
    }

    return { status: 200, errors: [], data: { checkedInCount, attendees } };
};
