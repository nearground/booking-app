import modelRegistry1 from '../models/index.js';
import { sendError } from '../utils/http-response.js';

const { sequelize } = modelRegistry1;

const getOrganizationMembership = async (userId, organizationId) => {
    if (!userId || !organizationId) {
        return null;
    }

    return sequelize.models.OrganizationMembers.findOne({
        where: {
            UserId: userId,
            OrganizationId: organizationId,
        },
    });
};

const requireOrganizationMember = async (req, res, next) => {
    try {
        const orgId = Number(
            req.body.organizationId ||
                req.body.OrganizationId ||
                req.params.organizationId ||
                req.query.organizationId
        );

        if (!Number.isInteger(orgId)) {
            return res.status(400).json({
                errors: ['organizationId is required'],
                data: {},
            });
        }

        const membership = await getOrganizationMembership(req.user.id, orgId);
        if (!membership) {
            return res.status(403).json({
                errors: ['You are not a member of this organization'],
                data: {},
            });
        }

        req.organizationMembership = membership;
        req.organizationId = orgId;
        return next();
    } catch (error) {
        return sendError(res, {
            status: 500,
            message: 'Unable to validate organization membership',
            requestId: req.requestId,
        });
    }
};

const requireOrganizationAdmin = async (req, res, next) => {
    try {
        await requireOrganizationMember(req, res, async () => {
            if (!req.organizationMembership?.isAdmin) {
                return res.status(403).json({
                    errors: ['Only organization admins can perform this action'],
                    data: {},
                });
            }

            return next();
        });
    } catch (error) {
        return sendError(res, {
            status: 500,
            message: 'Unable to validate organization admin status',
            requestId: req.requestId,
        });
    }
};

const defaultExport = { getOrganizationMembership, requireOrganizationMember, requireOrganizationAdmin };

export { getOrganizationMembership, requireOrganizationMember, requireOrganizationAdmin };
export default defaultExport;
