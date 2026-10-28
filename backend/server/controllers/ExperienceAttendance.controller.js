import {
    getEventAttendance,
    getPublicExperienceAttendance,
} from '../services/ExperienceAttendance.service.js';
import { sendError } from '../utils/http-response.js';

export const getExperienceAttendance = async (req, res) => {
    res.set('Cache-Control', 'no-store');
    try {
        const result = req.params.sessionId
            ? await getPublicExperienceAttendance(req.params)
            : await getEventAttendance(req.params);
        return res
            .status(result.status)
            .json({ errors: result.errors, data: result.data });
    } catch {
        return sendError(res, {
            status: 500,
            message: 'Could not load attendance',
            requestId: req.requestId,
        });
    }
};
