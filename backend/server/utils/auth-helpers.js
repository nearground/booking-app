import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);



const Jwt = require('jsonwebtoken');
require('dotenv').config();

const jwtSecret = process.env.JWT_SECRET;
if (
    !jwtSecret ||
    jwtSecret.trim().length < 32 ||
    jwtSecret.trim().toLowerCase() === 'your-secret-jwt-key-change-in-production'
) {
    throw new Error('JWT_SECRET must be a unique, randomly generated secret of at least 32 characters, not the example value.');
}

/**
 * Extracts the JWT token from the Authorization header.
 *
 * @param {string} authorization - The Authorization header content.
 * @returns {string} The extracted token, or an empty string if the token is not present or the header is not properly formatted.
 */
const getToken = (authorization) => {
    if (!authorization) return '';

    const [bearer, token] = authorization.split(' ');
    return bearer === 'Bearer' && token ? token : '';
};

/**
 * Validates a JWT token.
 *
 * @param {string} token - The JWT token to validate.
 * @returns {boolean} True if the token is valid, false otherwise.
 */
const validateToken = (token) => {
    try {
        const decodedToken = Jwt.verify(token, jwtSecret);
        return decodedToken;
    } catch (error) {
        return false;
    }
};

/**
 * Generates a new JWT token based on the user object.
 *
 * Throws an error if the user object is invalid.
 *
 * @param {Object} user - The user object from which to generate the token.
 * @param {string} user.id - The user's ID.
 * @param {string} user.firstName - The user's first name.
 * @param {string} user.lastName - The user's last name.
 * @returns {string} A new JWT token.
 * @throws {Error} If the user object is invalid.
 */
const generateNewToken = (user) => {
    if (!user || !user.id) {
        throw new Error('Invalid user object for token generation.');
    }

    const payload = {
        name: `${user.firstName} ${user.lastName}`,
        id: user.id,
        username: user.username,
    };

    return Jwt.sign(payload, jwtSecret, { expiresIn: '1h' });
};

const defaultExport = { getToken, validateToken, generateNewToken };

export { getToken, validateToken, generateNewToken };
export default defaultExport;
