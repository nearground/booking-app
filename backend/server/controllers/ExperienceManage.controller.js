import modelRegistry1 from '../models/index.js';
import { syncExperienceSchedule, populateScheduleBounded, previewStartDateUpdate, confirmStartDateUpdate } from '../services/Scheduler.service.js';
import { sendError } from '../utils/http-response.js';
import cache from '../utils/cache.js';
import { Op } from 'sequelize';
import { normalizeDetailsMetadata, validatePartyConfiguration } from '../utils/experience-details-metadata.js';
import {
    normalizeBaseCreatePayload,
    normalizeBaseUpdatePayload,
    createAssignOrganizersHandler,
    createSyncManagedScheduleHandler,
    normalizeSchedules,
} from './offering-manage.shared.js';

const {
    Experience,
    Location,
    Organization,
    TicketTier,
    User,
    ScheduledExperience,
    ExperienceReservation,
    Comment,
    sequelize,
} = modelRegistry1;

const ScheduleTemplate = sequelize.models.ScheduleTemplate;
const PickedOccurrence = sequelize.models.PickedOccurrence;

const MAX_EXPERIENCE_TITLE_LENGTH = 120;
const MAX_EXPERIENCE_SUBTITLE_LENGTH = 180;
const MAX_EXPERIENCE_DESCRIPTION_LENGTH = 5000;
const MAX_TICKET_TIERS = 20;
const MAX_TICKET_TIER_TITLE_LENGTH = 80;
const MAX_TICKET_TIER_DESCRIPTION_LENGTH = 500;
const MAX_USER_QUESTIONNARY_QUESTIONS = 20;
const MAX_USER_QUESTION_PROMPT_LENGTH = 250;

const buildQuestionKeyFromPrompt = (prompt) =>
    String(prompt || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 80);

const normalizeUserQuestionnary = (questionnary) => {
    if (questionnary === undefined) {
        return { questions: null, errors: [] };
    }

    if (!Array.isArray(questionnary)) {
        return { questions: [], errors: ['userQuestionnary must be an array'] };
    }

    if (questionnary.length > MAX_USER_QUESTIONNARY_QUESTIONS) {
        return {
            questions: [],
            errors: [`userQuestionnary cannot exceed ${MAX_USER_QUESTIONNARY_QUESTIONS} entries`],
        };
    }

    const errors = [];
    const seenQuestionKeys = new Set();

    const questions = questionnary.map((question, index) => {
        let prompt = '';
        let questionKey = '';
        let required = false;

        let type = 'text';

        if (typeof question === 'string') {
            prompt = question.trim();
            questionKey = buildQuestionKeyFromPrompt(prompt);
        } else {
            prompt = String(question?.prompt || question?.question || '').trim();
            questionKey = String(question?.questionKey || '').trim() || buildQuestionKeyFromPrompt(prompt);
            required = Boolean(question?.required);
            if (question?.type && ['text', 'boolean'].includes(String(question.type).trim())) {
                type = String(question.type).trim();
            }
        }

        if (!prompt) {
            errors.push(`userQuestionnary[${index}].prompt is required`);
        }

        if (prompt.length > MAX_USER_QUESTION_PROMPT_LENGTH) {
            errors.push(
                `userQuestionnary[${index}].prompt cannot exceed ${MAX_USER_QUESTION_PROMPT_LENGTH} characters`
            );
        }

        if (!questionKey) {
            errors.push(`userQuestionnary[${index}].questionKey is required`);
        }

        if (questionKey && seenQuestionKeys.has(questionKey)) {
            errors.push(`userQuestionnary[${index}].questionKey must be unique`);
        }

        if (questionKey) {
            seenQuestionKeys.add(questionKey);
        }

        return {
            questionKey,
            prompt,
            required,
            type,
        };
    });

    return { questions, errors };
};

const normalizeTierUserQuestionnary = (questionnary, ticketTierIndex) => {
    if (questionnary === undefined) {
        return { questions: [], errors: [] };
    }

    if (!Array.isArray(questionnary)) {
        return {
            questions: [],
            errors: [`ticketTiers[${ticketTierIndex}].userQuestionnary must be an array`],
        };
    }

    if (questionnary.length > MAX_USER_QUESTIONNARY_QUESTIONS) {
        return {
            questions: [],
            errors: [
                `ticketTiers[${ticketTierIndex}].userQuestionnary cannot exceed ${MAX_USER_QUESTIONNARY_QUESTIONS} entries`,
            ],
        };
    }

    const errors = [];
    const seenQuestionKeys = new Set();

    const questions = questionnary.map((question, questionIndex) => {
        let prompt = '';
        let questionKey = '';
        let required = false;

        let type = 'text';

        if (typeof question === 'string') {
            prompt = question.trim();
            questionKey = buildQuestionKeyFromPrompt(prompt);
        } else {
            prompt = String(question?.prompt || question?.question || '').trim();
            questionKey = String(question?.questionKey || '').trim() || buildQuestionKeyFromPrompt(prompt);
            required = Boolean(question?.required);
            if (question?.type && ['text', 'boolean'].includes(String(question.type).trim())) {
                type = String(question.type).trim();
            }
        }

        if (!prompt) {
            errors.push(`ticketTiers[${ticketTierIndex}].userQuestionnary[${questionIndex}].prompt is required`);
        }

        if (prompt.length > MAX_USER_QUESTION_PROMPT_LENGTH) {
            errors.push(
                `ticketTiers[${ticketTierIndex}].userQuestionnary[${questionIndex}].prompt cannot exceed ${MAX_USER_QUESTION_PROMPT_LENGTH} characters`
            );
        }

        if (!questionKey) {
            errors.push(`ticketTiers[${ticketTierIndex}].userQuestionnary[${questionIndex}].questionKey is required`);
        }

        if (questionKey && seenQuestionKeys.has(questionKey)) {
            errors.push(
                `ticketTiers[${ticketTierIndex}].userQuestionnary[${questionIndex}].questionKey must be unique`
            );
        }

        if (questionKey) {
            seenQuestionKeys.add(questionKey);
        }

        return {
            questionKey,
            prompt,
            required,
            type,
        };
    });

    return { questions, errors };
};

const validateTicketTiers = (ticketTiers) => {
    if (ticketTiers === undefined) {
        return { tiers: null, errors: [] };
    }

    if (!Array.isArray(ticketTiers)) {
        return { tiers: [], errors: ['ticketTiers must be an array'] };
    }

    if (ticketTiers.length > MAX_TICKET_TIERS) {
        return {
            tiers: [],
            errors: [`ticketTiers cannot exceed ${MAX_TICKET_TIERS} entries`],
        };
    }

    const errors = [];
    const tiers = ticketTiers.map((tier, index) => {
        const {
            questions: tierQuestionnary,
            errors: tierQuestionnaryErrors,
        } = normalizeTierUserQuestionnary(tier.userQuestionnary, index);

        errors.push(...tierQuestionnaryErrors);

        const parsedMinAge = Number(tier.minAge);
        const rawMaxAge = tier.maxAge;
        const normalizedMaxAgeInput =
            rawMaxAge === null || rawMaxAge === undefined || String(rawMaxAge).trim() === ''
                ? null
                : Number(rawMaxAge);

        const normalizedTier = {
            title: String(tier.title || '').trim(),
            price: Number(tier.price),
            description: tier.description ? String(tier.description).trim() : null,
            userQuestionnary: tierQuestionnary,
            minAge: Number.isFinite(parsedMinAge) ? parsedMinAge : 0,
            maxAge: Number.isFinite(normalizedMaxAgeInput) ? normalizedMaxAgeInput : null,
        };

        if (!normalizedTier.title) {
            errors.push(`ticketTiers[${index}].title is required`);
        }

        if (normalizedTier.title.length > MAX_TICKET_TIER_TITLE_LENGTH) {
            errors.push(
                `ticketTiers[${index}].title cannot exceed ${MAX_TICKET_TIER_TITLE_LENGTH} characters`
            );
        }

        if (!Number.isFinite(normalizedTier.price) || normalizedTier.price < 0) {
            errors.push(`ticketTiers[${index}].price must be a non-negative number`);
        }

        if (!Number.isInteger(normalizedTier.minAge) || normalizedTier.minAge < 0) {
            errors.push(`ticketTiers[${index}].minAge must be an integer greater than or equal to 0`);
        }

        if (normalizedTier.maxAge !== null && !Number.isInteger(normalizedTier.maxAge)) {
            errors.push(`ticketTiers[${index}].maxAge must be an integer when provided`);
        }

        if (
            Number.isInteger(normalizedTier.maxAge) &&
            Number.isInteger(normalizedTier.minAge) &&
            normalizedTier.maxAge <= normalizedTier.minAge
        ) {
            errors.push(`ticketTiers[${index}].maxAge must be greater than minAge`);
        }

        if (
            normalizedTier.description &&
            normalizedTier.description.length > MAX_TICKET_TIER_DESCRIPTION_LENGTH
        ) {
            errors.push(
                `ticketTiers[${index}].description cannot exceed ${MAX_TICKET_TIER_DESCRIPTION_LENGTH} characters`
            );
        }

        return normalizedTier;
    });

    return { tiers, errors };
};

const createExperience = async (req, res) => {
    const transaction = await sequelize.transaction();

    try {
        const { errors, normalized } = normalizeBaseCreatePayload(req.body, {
            maxTitleLength: MAX_EXPERIENCE_TITLE_LENGTH,
            maxSubtitleLength: MAX_EXPERIENCE_SUBTITLE_LENGTH,
            maxDescriptionLength: MAX_EXPERIENCE_DESCRIPTION_LENGTH,
        });
        const { metadata: detailsMetadata, errors: metadataErrors } = normalizeDetailsMetadata(req.body.detailsMetadata);
        errors.push(...metadataErrors);
        if (errors.length > 0) {
            await transaction.rollback();
            return res.status(400).json({ errors, data: {} });
        }

        const {
            questions: userQuestionnary,
            errors: questionnaryErrors,
        } = normalizeUserQuestionnary(req.body.userQuestionnary);

        if (questionnaryErrors.length > 0) {
            await transaction.rollback();
            return res.status(400).json({ errors: questionnaryErrors, data: {} });
        }

        if (req.organizationId !== normalized.organizationId) {
            await transaction.rollback();
            return res.status(403).json({
                errors: ['Authenticated organization does not match payload organizationId'],
                data: {},
            });
        }

        const [location, organization] = await Promise.all([
            Location.findOne({
                where: {
                    id: normalized.locationId,
                    OrganizationId: normalized.organizationId,
                },
                transaction,
            }),
            Organization.findByPk(normalized.organizationId, { transaction }),
        ]);

        if (!location || !organization) {
            await transaction.rollback();
            return res.status(400).json({
                errors: ['Invalid locationId for the specified organization or invalid organizationId'],
                data: {},
            });
        }

        let partyConfiguration = null;
        if (detailsMetadata.template === 'party') {
            const schedules = normalizeSchedules(req.body.schedules);
            const tiers = validateTicketTiers(req.body.ticketTiers);
            partyConfiguration = validatePartyConfiguration({ ...schedules, tiers: tiers.tiers || [] });
            const partyErrors = [...schedules.errors, ...tiers.errors, ...partyConfiguration.errors];
            if (partyErrors.length) {
                await transaction.rollback();
                return res.status(400).json({ errors: partyErrors, data: {} });
            }
        }

        const experience = await Experience.create(
            {
                title: normalized.title,
                capacity: normalized.capacity,
                duration: normalized.duration,
                subtitle: normalized.subtitle,
                description: normalized.description,
                thumbnail: normalized.thumbnail,
                images: normalized.images,
                detailsMetadata,
                ...(partyConfiguration ? { autoSyncEnabled: false } : {}),
                ratings: normalized.ratings,
                userQuestionnary: Array.isArray(userQuestionnary) ? userQuestionnary : [],
                OrganizationId: normalized.organizationId,
                LocationId: normalized.locationId,
                UserId: req.user.id,
            },
            { transaction }
        );

        // If schedules payload provided, normalize and create templates/picks
        if (req.body.schedules !== undefined) {
            const { templates, picks, errors: scheduleErrors } = normalizeSchedules(req.body.schedules);
            if (scheduleErrors.length > 0) {
                await transaction.rollback();
                return res.status(400).json({ errors: scheduleErrors, data: {} });
            }

            const createdTemplates = [];
            for (const tpl of templates) {
                // attach ExperienceId
                // allow nulls where appropriate
                const created = await sequelize.models.ScheduleTemplate.create({
                    ...tpl,
                    ExperienceId: experience.id,
                }, { transaction });
                createdTemplates.push(created);
            }

            const createdPicks = [];
            for (const pk of picks) {
                const created = await sequelize.models.PickedOccurrence.create({
                    ...pk,
                    ExperienceId: experience.id,
                }, { transaction });
                createdPicks.push(created);
            }
        }

        const { tiers: ticketTiers, errors: ticketTierErrors } = validateTicketTiers(req.body.ticketTiers);
        if (ticketTierErrors.length > 0) {
            await transaction.rollback();
            return res.status(400).json({ errors: ticketTierErrors, data: {} });
        }

        if (Array.isArray(ticketTiers) && ticketTiers.length > 0) {
            await TicketTier.bulkCreate(
                ticketTiers.map((tier) => ({
                    title: tier.title,
                    price: tier.price,
                    description: tier.description,
                    userQuestionnary: tier.userQuestionnary,
                    minAge: tier.minAge,
                    maxAge: tier.maxAge,
                    maxTickets: tier.maxTickets || 10,
                    idType: null,
                    ExperienceId: experience.id,
                })),
                { transaction }
            );
        }

        await experience.addOrganizer(req.user.id, { transaction });

        if (partyConfiguration) {
            await ScheduledExperience.create({
                ExperienceId: experience.id,
                dateTime: partyConfiguration.dateTime,
                endDateTime: partyConfiguration.endDateTime || new Date(new Date(partyConfiguration.dateTime).getTime() + (partyConfiguration.durationMinutes || normalized.duration) * 60000),
                capacity: partyConfiguration.capacity ?? normalized.capacity,
                availableSpots: partyConfiguration.capacity ?? normalized.capacity,
                status: 'scheduled',
            }, { transaction });
        }

        await transaction.commit();
        // Run sync after commit to materialize scheduled experiences
        try {
            // eslint-disable-next-line no-console
            syncExperienceSchedule(experience).catch(err => console.error('Error syncing schedule after create:', err));
        } catch (e) {
            // swallow
        }
        const createdExperience = await Experience.findByPk(experience.id, {
            include: [{ model: TicketTier }],
        });

        // invalidate related caches
        try {
            await cache.delByPrefix('experiences:');
            await cache.del(`experience:detail:${createdExperience.id}`);
        } catch (e) {
            /* ignore cache errors */
        }

        return res.status(201).json({
            errors: [],
            data: {
                experience: createdExperience,
            },
        });
    } catch (error) {
        await transaction.rollback();
        // eslint-disable-next-line no-console
        console.error('Error in createExperience:', {
            message: error?.message,
            stack: error?.stack,
            payload: req.body,
            userId: req.user?.id,
            organizationId: req.organizationId,
        });

        const message = process.env.NODE_ENV === 'production'
            ? 'Error creating experience'
            : error?.message || 'Error creating experience';

        return sendError(res, {
            status: 500,
            message,
            requestId: req.requestId,
        });
    }
};

const updateExperience = async (req, res) => {
    const transaction = await sequelize.transaction();

    try {
        const experienceId = Number(req.params.experienceId);
        if (!Number.isInteger(experienceId)) {
            await transaction.rollback();
            return res.status(400).json({ errors: ['Invalid experience id'], data: {} });
        }

        const experience = await Experience.findByPk(experienceId, { transaction, lock: true });
        if (!experience) {
            await transaction.rollback();
            return res.status(404).json({ errors: ['Experience not found'], data: {} });
        }

        const membership = await sequelize.models.OrganizationMembers.findOne({
            where: {
                UserId: req.user.id,
                OrganizationId: experience.OrganizationId,
                isAdmin: true,
            },
            transaction,
        });

        if (!membership) {
            await transaction.rollback();
            return res.status(403).json({
                errors: ['Only organization admins can update this experience'],
                data: {},
            });
        }

        const {
            errors: updatePayloadErrors,
            updatePayload,
        } = normalizeBaseUpdatePayload(req.body, {
            maxTitleLength: MAX_EXPERIENCE_TITLE_LENGTH,
            maxSubtitleLength: MAX_EXPERIENCE_SUBTITLE_LENGTH,
            maxDescriptionLength: MAX_EXPERIENCE_DESCRIPTION_LENGTH,
        });
        if (req.body.detailsMetadata !== undefined) {
            const { metadata, errors } = normalizeDetailsMetadata(req.body.detailsMetadata);
            updatePayloadErrors.push(...errors);
            updatePayload.detailsMetadata = metadata;
        }

        if (updatePayloadErrors.length > 0) {
            await transaction.rollback();
            return res.status(400).json({
                errors: updatePayloadErrors,
                data: {},
            });
        }

        if (req.body.userQuestionnary !== undefined) {
            const {
                questions: userQuestionnary,
                errors: questionnaryErrors,
            } = normalizeUserQuestionnary(req.body.userQuestionnary);

            if (questionnaryErrors.length > 0) {
                await transaction.rollback();
                return res.status(400).json({ errors: questionnaryErrors, data: {} });
            }

            updatePayload.userQuestionnary = Array.isArray(userQuestionnary)
                ? userQuestionnary
                : [];
        }

        let partyConfiguration = null;
        let partyNeedsSession = false;
        const effectiveMetadata = normalizeDetailsMetadata(updatePayload.detailsMetadata ?? experience.detailsMetadata).metadata;
        if (effectiveMetadata.template === 'party') {
            const schedules = req.body.schedules !== undefined
                ? normalizeSchedules(req.body.schedules)
                : {
                    templates: await ScheduleTemplate.findAll({ where: { ExperienceId: experience.id }, transaction }),
                    picks: await PickedOccurrence.findAll({ where: { ExperienceId: experience.id, status: 'active' }, transaction }),
                    errors: [],
                };
            const tiers = req.body.ticketTiers !== undefined
                ? validateTicketTiers(req.body.ticketTiers)
                : { tiers: await TicketTier.findAll({ where: { ExperienceId: experience.id }, transaction }), errors: [] };
            partyConfiguration = validatePartyConfiguration({ ...schedules, tiers: tiers.tiers || [] });
            const sessions = await ScheduledExperience.findAll({
                where: { ExperienceId: experience.id },
                limit: 2,
                transaction,
            });
            const partyErrors = [...schedules.errors, ...tiers.errors, ...partyConfiguration.errors];
            if (sessions.length > 1) partyErrors.push('Party experiences cannot have multiple existing sessions');
            if (sessions.length === 1 && new Date(sessions[0].dateTime).getTime() !== new Date(partyConfiguration.dateTime).getTime()) {
                partyErrors.push('An existing party session date cannot be changed through experience editing');
            }
            if (partyErrors.length) {
                await transaction.rollback();
                return res.status(400).json({ errors: partyErrors, data: {} });
            }
            partyNeedsSession = sessions.length === 0;
            updatePayload.autoSyncEnabled = false;
        }
        await experience.update(updatePayload, { transaction });

        // Handle schedules update payload: create/replace templates and picks
        if (req.body.schedules !== undefined) {
            const { templates, picks, errors: scheduleErrors } = normalizeSchedules(req.body.schedules);
            if (scheduleErrors.length > 0) {
                await transaction.rollback();
                return res.status(400).json({ errors: scheduleErrors, data: {} });
            }

            // For simplicity on update: remove existing templates and picks and recreate
            await sequelize.models.ScheduleTemplate.destroy({ where: { ExperienceId: experience.id }, transaction });
            await sequelize.models.PickedOccurrence.destroy({ where: { ExperienceId: experience.id }, transaction });

            for (const tpl of templates) {
                await sequelize.models.ScheduleTemplate.create({ ...tpl, ExperienceId: experience.id }, { transaction });
            }
            for (const pk of picks) {
                await sequelize.models.PickedOccurrence.create({ ...pk, ExperienceId: experience.id }, { transaction });
            }
        }

        if (Array.isArray(req.body.ticketTiers)) {
            const { tiers: ticketTiers, errors: ticketTierErrors } = validateTicketTiers(req.body.ticketTiers);
            if (ticketTierErrors.length > 0) {
                await transaction.rollback();
                return res.status(400).json({ errors: ticketTierErrors, data: {} });
            }

            await TicketTier.destroy({ where: { ExperienceId: experience.id }, transaction });
            if (ticketTiers.length > 0) {
                await TicketTier.bulkCreate(
                    ticketTiers.map((tier) => ({
                        title: tier.title,
                        price: tier.price,
                        description: tier.description,
                        userQuestionnary: tier.userQuestionnary,
                        minAge: tier.minAge,
                        maxAge: tier.maxAge,
                        maxTickets: tier.maxTickets || 10,
                        idType: null,
                        ExperienceId: experience.id,
                    })),
                    { transaction }
                );
            }
        }

        if (partyNeedsSession) {
            await ScheduledExperience.create({
                ExperienceId: experience.id,
                dateTime: partyConfiguration.dateTime,
                endDateTime: partyConfiguration.endDateTime || new Date(new Date(partyConfiguration.dateTime).getTime() + (partyConfiguration.durationMinutes || experience.duration) * 60000),
                capacity: partyConfiguration.capacity ?? experience.capacity,
                availableSpots: partyConfiguration.capacity ?? experience.capacity,
                status: 'scheduled',
            }, { transaction });
        }
        await transaction.commit();

        const updatedExperience = await Experience.findByPk(experience.id, {
            include: [{ model: TicketTier }],
        });

        // Trigger sync after update (non-blocking)
        try {
            // eslint-disable-next-line no-console
            syncExperienceSchedule(updatedExperience).catch(err => console.error('Error syncing schedule after update:', err));
        } catch (e) {
            // swallow
        }

        // invalidate related caches
        try {
            await cache.delByPrefix('experiences:');
            await cache.del(`experience:detail:${updatedExperience.id}`);
        } catch (e) {
            /* ignore cache errors */
        }

        return res.status(200).json({
            errors: [],
            data: {
                experience: updatedExperience,
            },
        });
    } catch (error) {
        await transaction.rollback();
        return sendError(res, {
            status: 500,
            message: 'Error updating experience',
            requestId: req.requestId,
        });
    }
};

const deleteExperience = async (req, res) => {
    const transaction = await sequelize.transaction();

    try {
        const experienceId = Number(req.params.experienceId);
        if (!Number.isInteger(experienceId)) {
            await transaction.rollback();
            return res.status(400).json({ errors: ['Invalid experience id'], data: {} });
        }

        const experience = await Experience.findByPk(experienceId, { transaction });
        if (!experience) {
            await transaction.rollback();
            return res.status(404).json({ errors: ['Experience not found'], data: {} });
        }

        const membership = await sequelize.models.OrganizationMembers.findOne({
            where: {
                UserId: req.user.id,
                OrganizationId: experience.OrganizationId,
                isAdmin: true,
            },
            transaction,
        });

        if (!membership) {
            await transaction.rollback();
            return res.status(403).json({
                errors: ['Only organization admins can delete this experience'],
                data: {},
            });
        }

        const scheduledSessions = await ScheduledExperience.findAll({
            where: { ExperienceId: experience.id },
            attributes: ['id'],
            transaction,
        });
        const scheduledSessionIds = scheduledSessions.map((session) => session.id);

        if (scheduledSessionIds.length > 0) {
            const reservationCount = await ExperienceReservation.count({
                where: { ScheduledExperienceId: { [Op.in]: scheduledSessionIds } },
                transaction,
            });

            if (reservationCount > 0) {
                await transaction.rollback();
                return res.status(409).json({
                    errors: ['Cannot delete an experience that has reservations. Cancel or clear the sessions first.'],
                    data: {},
                });
            }
        }

        if (sequelize.models.ExperienceOrganizers) {
            await sequelize.models.ExperienceOrganizers.destroy({
                where: { ExperienceId: experience.id },
                transaction,
            });
        }

        await sequelize.models.ScheduleTemplate.destroy({ where: { ExperienceId: experience.id }, transaction });
        await sequelize.models.PickedOccurrence.destroy({ where: { ExperienceId: experience.id }, transaction });
        await TicketTier.destroy({ where: { ExperienceId: experience.id }, transaction });
        await Comment.destroy({
            where: {
                CommentableType: 'Experience',
                CommentableId: experience.id,
            },
            transaction,
        });
        await ScheduledExperience.destroy({ where: { ExperienceId: experience.id }, transaction });
        await experience.destroy({ transaction });

        await transaction.commit();

        try {
            await cache.delByPrefix('experiences:');
            await cache.del(`experience:detail:${experience.id}`);
        } catch (e) {
            /* ignore cache errors */
        }

        return res.status(200).json({ errors: [], data: { deleted: true } });
    } catch (error) {
        await transaction.rollback();
        return sendError(res, {
            status: 500,
            message: 'Error deleting experience',
            requestId: req.requestId,
        });
    }
};

const assignExperienceOrganizersHandler = createAssignOrganizersHandler({
    sequelize,
    User,
    entityModel: Experience,
    entityLabel: 'Experience',
    entityIdParam: 'experienceId',
    responseKey: 'experience',
});

const syncManagedExperienceScheduleHandler = createSyncManagedScheduleHandler({
    sequelize,
    entityModel: Experience,
    entityLabel: 'Experience',
    entityIdParam: 'experienceId',
    syncSchedule: syncExperienceSchedule,
    scheduledModel: ScheduledExperience,
    scheduleForeignKey: 'ExperienceId',
});

const toggleAutoSync = async (req, res) => {
    try {
        const experienceId = Number(req.params.experienceId);
        if (!Number.isInteger(experienceId)) {
            return res.status(400).json({ errors: ['Invalid experience id'], data: {} });
        }

        const experience = await Experience.findByPk(experienceId);
        if (!experience) {
            return res.status(404).json({ errors: ['Experience not found'], data: {} });
        }

        const membership = await sequelize.models.OrganizationMembers.findOne({
            where: {
                UserId: req.user.id,
                OrganizationId: experience.OrganizationId,
                isAdmin: true,
            },
        });

        if (!membership) {
            return res.status(403).json({
                errors: ['Only organization admins can update this experience'],
                data: {},
            });
        }

        const enabled = Boolean(req.body.enabled);
        if (enabled && normalizeDetailsMetadata(experience.detailsMetadata).metadata.template === 'party') {
            return res.status(400).json({
                errors: ['Party experiences cannot enable recurring schedule synchronization'],
                data: {},
            });
        }
        await experience.update({ autoSyncEnabled: enabled });

        return res.status(200).json({
            errors: [],
            data: { autoSyncEnabled: enabled },
        });
    } catch (error) {
        return sendError(res, {
            status: 500,
            message: 'Error toggling auto-sync',
            requestId: req.requestId,
        });
    }
};

const updateLookahead = async (req, res) => {
    try {
        const experienceId = Number(req.params.experienceId);
        if (!Number.isInteger(experienceId)) {
            return res.status(400).json({ errors: ['Invalid experience id'], data: {} });
        }

        const experience = await Experience.findByPk(experienceId);
        if (!experience) {
            return res.status(404).json({ errors: ['Experience not found'], data: {} });
        }

        const membership = await sequelize.models.OrganizationMembers.findOne({
            where: {
                UserId: req.user.id,
                OrganizationId: experience.OrganizationId,
                isAdmin: true,
            },
        });

        if (!membership) {
            return res.status(403).json({
                errors: ['Only organization admins can update this experience'],
                data: {},
            });
        }

        const days = Number(req.body.days);
        if (!Number.isInteger(days) || days < 1 || days > 730) {
            return res.status(400).json({
                errors: ['days must be an integer between 1 and 730'],
                data: {},
            });
        }

        await experience.update({ scheduleLookaheadDays: days });

        return res.status(200).json({
            errors: [],
            data: { scheduleLookaheadDays: days },
        });
    } catch (error) {
        return sendError(res, {
            status: 500,
            message: 'Error updating lookahead',
            requestId: req.requestId,
        });
    }
};

const toggleSessionSyncLock = async (req, res) => {
    try {
        const sessionId = Number(req.params.sessionId);
        if (!Number.isInteger(sessionId)) {
            return res.status(400).json({ errors: ['Invalid session id'], data: {} });
        }

        const session = await ScheduledExperience.findByPk(sessionId);
        if (!session) {
            return res.status(404).json({ errors: ['Scheduled session not found'], data: {} });
        }

        const experience = await Experience.findByPk(session.ExperienceId, {
            attributes: ['id', 'OrganizationId'],
        });
        if (!experience) {
            return res.status(404).json({ errors: ['Experience not found'], data: {} });
        }

        const membership = await sequelize.models.OrganizationMembers.findOne({
            where: {
                UserId: req.user.id,
                OrganizationId: experience.OrganizationId,
                isAdmin: true,
            },
        });

        if (!membership) {
            return res.status(403).json({
                errors: ['Only organization admins can update this session'],
                data: {},
            });
        }

        const locked = Boolean(req.body.locked);
        await session.update({ syncLocked: locked });

        return res.status(200).json({
            errors: [],
            data: { syncLocked: locked },
        });
    } catch (error) {
        return sendError(res, {
            status: 500,
            message: 'Error toggling sync lock',
            requestId: req.requestId,
        });
    }
};

const previewPopulateSchedule = async (req, res) => {
    try {
        const experienceId = Number(req.params.experienceId);
        if (!Number.isInteger(experienceId)) {
            return res.status(400).json({ errors: ['Invalid experience id'], data: {} });
        }

        const { templateId, startDate, endDate } = req.body;
        const result = await populateScheduleBounded({
            experienceId,
            templateId: Number(templateId),
            startDate,
            endDate,
            dryRun: true,
        });

        return res.status(200).json({ errors: [], data: result });
    } catch (error) {
        if (error.status && error.errors) {
            return res.status(error.status).json({ errors: error.errors, data: {} });
        }
        return sendError(res, {
            status: 500,
            message: 'Error previewing schedule population',
            requestId: req.requestId,
        });
    }
};

const populateSchedule = async (req, res) => {
    try {
        const experienceId = Number(req.params.experienceId);
        if (!Number.isInteger(experienceId)) {
            return res.status(400).json({ errors: ['Invalid experience id'], data: {} });
        }

        const { templateId, startDate, endDate } = req.body;
        const result = await populateScheduleBounded({
            experienceId,
            templateId: Number(templateId),
            startDate,
            endDate,
            dryRun: false,
        });

        // invalidate caches
        try {
            await cache.delByPrefix('experiences:');
            await cache.del(`experience:detail:${experienceId}`);
        } catch (_e) { /* ignore */ }

        return res.status(200).json({ errors: [], data: result });
    } catch (error) {
        if (error.status && error.errors) {
            return res.status(error.status).json({ errors: error.errors, data: {} });
        }
        return sendError(res, {
            status: 500,
            message: 'Error populating schedule',
            requestId: req.requestId,
        });
    }
};

const previewStartDate = async (req, res) => {
    try {
        const experienceId = Number(req.params.experienceId);
        if (!Number.isInteger(experienceId)) {
            return res.status(400).json({ errors: ['Invalid experience id'], data: {} });
        }

        const { newStartDate } = req.body;
        const result = await previewStartDateUpdate({ experienceId, newStartDate });

        return res.status(200).json({ errors: [], data: result });
    } catch (error) {
        if (error.status && error.errors) {
            return res.status(error.status).json({ errors: error.errors, data: {} });
        }
        return sendError(res, {
            status: 500,
            message: 'Error previewing start date update',
            requestId: req.requestId,
        });
    }
};

const confirmStartDate = async (req, res) => {
    try {
        const experienceId = Number(req.params.experienceId);
        if (!Number.isInteger(experienceId)) {
            return res.status(400).json({ errors: ['Invalid experience id'], data: {} });
        }

        const { newStartDate, cancelEmptySessions } = req.body;
        const result = await confirmStartDateUpdate({
            experienceId,
            newStartDate,
            cancelEmptySessions: Boolean(cancelEmptySessions),
        });

        // invalidate caches
        try {
            await cache.delByPrefix('experiences:');
            await cache.del(`experience:detail:${experienceId}`);
        } catch (_e) { /* ignore */ }

        return res.status(200).json({ errors: [], data: result });
    } catch (error) {
        if (error.status && error.errors) {
            return res.status(error.status).json({ errors: error.errors, data: {} });
        }
        return sendError(res, {
            status: 500,
            message: 'Error updating start date',
            requestId: req.requestId,
        });
    }
};

const getExperienceForEdit = async (req, res) => {
    try {
        const experienceId = Number(req.params.experienceId);
        if (!Number.isInteger(experienceId)) {
            return res.status(400).json({ errors: ['Invalid experience id'], data: {} });
        }

        const experience = await Experience.findByPk(experienceId, {
            include: [
                {
                    model: Location,
                    attributes: ['id', 'name', 'city', 'state', 'country', 'street', 'zipCode', 'timezone', 'coordinates'],
                },
                {
                    model: TicketTier,
                    attributes: ['id', 'title', 'description', 'minAge', 'maxAge', 'price', 'userQuestionnary'],
                    required: false,
                },
                {
                    model: ScheduleTemplate,
                    required: false,
                },
                {
                    model: PickedOccurrence,
                    required: false,
                },
                {
                    model: User,
                    as: 'Organizers',
                    attributes: ['id', 'firstName', 'lastName', 'profilePicture', 'email'],
                    through: { attributes: [] },
                    required: false,
                },
            ],
        });

        if (!experience) {
            return res.status(404).json({ errors: ['Experience not found'], data: {} });
        }

        // Verify requester is an admin of this experience's organization
        const membership = await sequelize.models.OrganizationMembers.findOne({
            where: {
                UserId: req.user.id,
                OrganizationId: experience.OrganizationId,
                isAdmin: true,
            },
        });

        if (!membership) {
            return res.status(403).json({
                errors: ['Only organization admins can access this resource'],
                data: {},
            });
        }

        const pinnedCommentIds = normalizeDetailsMetadata(experience.detailsMetadata).metadata.overrides.pinnedCommentIds || [];
        const reviewWhere = {
            CommentableId: experience.id,
            CommentableType: 'Experience',
            ParentId: null,
            stars: 5,
        };
        const [recentReviews, pinnedReviews] = await Promise.all([
            Comment.findAll({
                where: reviewWhere,
                attributes: ['id', 'stars', 'title', 'comment'],
                order: [['createdAt', 'DESC']],
                limit: 100,
            }),
            pinnedCommentIds.length
                ? Comment.findAll({
                    where: { ...reviewWhere, id: { [Op.in]: pinnedCommentIds } },
                    attributes: ['id', 'stars', 'title', 'comment'],
                })
                : Promise.resolve([]),
        ]);
        const pinnableComments = [...new Map(
            [...pinnedReviews, ...recentReviews].map((comment) => [comment.id, comment])
        ).values()].map((comment) => ({
            id: comment.id,
            stars: comment.stars,
            title: comment.title || '',
            comment: comment.comment,
        }));

        return res.status(200).json({
            errors: [],
            data: {
                experience: {
                    id: experience.id,
                    title: experience.title,
                    subtitle: experience.subtitle || '',
                    description: experience.description || '',
                    detailsMetadata: normalizeDetailsMetadata(experience.detailsMetadata).metadata,
                    pinnableComments,
                    thumbnail: experience.thumbnail || '',
                    capacity: experience.capacity,
                    duration: experience.duration,
                    userQuestionnary: Array.isArray(experience.userQuestionnary) ? experience.userQuestionnary : [],
                    OrganizationId: experience.OrganizationId,
                    LocationId: experience.LocationId,
                    Location: experience.Location || null,
                    TicketTiers: (experience.TicketTiers || []).map((tier) => ({
                        id: tier.id,
                        title: tier.title,
                        price: tier.price,
                        description: tier.description || '',
                        minAge: tier.minAge,
                        maxAge: tier.maxAge,
                        userQuestionnary: Array.isArray(tier.userQuestionnary) ? tier.userQuestionnary : [],
                    })),
                    ScheduleTemplates: (experience.ScheduleTemplates || []).map((tpl) => ({
                        id: tpl.id,
                        name: tpl.name || null,
                        ruleType: tpl.ruleType,
                        ruleCron: tpl.ruleCron || null,
                        ruleDateTime: tpl.ruleDateTime || null,
                        timezone: tpl.timezone || 'UTC',
                        durationMinutes: tpl.durationMinutes || null,
                        capacity: tpl.capacity || null,
                    })),
                    PickedOccurrences: (experience.PickedOccurrences || []).map((pick) => ({
                        id: pick.id,
                        dateTime: pick.dateTime,
                        endDateTime: pick.endDateTime || null,
                        capacity: pick.capacity || null,
                        note: pick.note || null,
                    })),
                    Organizers: (experience.Organizers || []).map((organizer) => ({
                        id: organizer.id,
                        firstName: organizer.firstName,
                        lastName: organizer.lastName,
                        profilePicture: organizer.profilePicture || '',
                        email: organizer.email,
                    })),
                },
            },
        });
    } catch (_error) {
        return sendError(res, {
            status: 500,
            message: 'Error fetching experience for edit',
            requestId: req.requestId,
        });
    }
};

const defaultExport = { createExperience, updateExperience, deleteExperience, getExperienceForEdit, assignExperienceOrganizers: assignExperienceOrganizersHandler, syncManagedExperienceSchedule: syncManagedExperienceScheduleHandler, toggleAutoSync, toggleSessionSyncLock, updateLookahead, previewPopulateSchedule, populateSchedule, previewStartDate, confirmStartDate };

export { createExperience, updateExperience, deleteExperience, getExperienceForEdit, assignExperienceOrganizersHandler as assignExperienceOrganizers, syncManagedExperienceScheduleHandler as syncManagedExperienceSchedule, toggleAutoSync, toggleSessionSyncLock, updateLookahead, previewPopulateSchedule, populateSchedule, previewStartDate, confirmStartDate };
export default defaultExport;
