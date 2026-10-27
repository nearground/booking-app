import modelRegistry1 from '../models/index.js';
import { sendError } from '../utils/http-response.js';

const { Experience, sequelize } = modelRegistry1;

const requireExperienceOrganizationAdmin = async (req, res, next) => {
    try {
        const experienceId = Number(req.params.experienceId);

        if (!Number.isInteger(experienceId)) {
            return res.status(400).json({
                errors: ['Invalid experience id'],
                data: {},
            });
        }

        const experience = await Experience.findByPk(experienceId, {
            attributes: ['id', 'OrganizationId'],
        });

        if (!experience) {
            return res.status(404).json({
                errors: ['Experience not found'],
                data: {},
            });
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
                errors: ['Only organization admins can perform this action'],
                data: {},
            });
        }

        req.organizationMembership = membership;
        req.organizationId = experience.OrganizationId;
        req.experienceId = experience.id;
        return next();
    } catch (_error) {
        return sendError(res, {
            status: 500,
            message: 'Unable to validate experience organization permissions',
            requestId: req.requestId,
        });
    }
};

const defaultExport = { requireExperienceOrganizationAdmin };

export { requireExperienceOrganizationAdmin };
export default defaultExport;
