import modelRegistry1 from '../models/index.js';
import { sendError } from '../utils/http-response.js';

const { Service, sequelize } = modelRegistry1;

const requireServiceOrganizationAdmin = async (req, res, next) => {
    try {
        const serviceId = Number(req.params.serviceId);

        if (!Number.isInteger(serviceId)) {
            return res.status(400).json({
                errors: ['Invalid service id'],
                data: {},
            });
        }

        const service = await Service.findByPk(serviceId, {
            attributes: ['id', 'OrganizationId'],
        });

        if (!service) {
            return res.status(404).json({
                errors: ['Service not found'],
                data: {},
            });
        }

        const membership = await sequelize.models.OrganizationMembers.findOne({
            where: {
                UserId: req.user.id,
                OrganizationId: service.OrganizationId,
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
        req.organizationId = service.OrganizationId;
        req.serviceId = service.id;
        return next();
    } catch (_error) {
        return sendError(res, {
            status: 500,
            message: 'Unable to validate service organization permissions',
            requestId: req.requestId,
        });
    }
};

const defaultExport = { requireServiceOrganizationAdmin };

export { requireServiceOrganizationAdmin };
export default defaultExport;
