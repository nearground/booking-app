import User from '../models/User.model.js';

function validateEmail(email) {
    return String(email)
        .trim()
        .toLowerCase()
        .match(
            /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
        );
}

async function UserExists(email) {
    try {
        const user = await User.findOne({ where: { email: String(email || '').trim().toLowerCase() } });
        return user !== null;
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error checking if user exists:', error);
        throw error;
    }
}

const USERNAME_REGEX = /^[a-z0-9._-]+$/i;

async function UsernameExists(username) {
    try {
        const user = await User.findOne({ where: { username } });
        return user !== null;
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error checking if username exists:', error);
        return false;
    }
}

function validatePhoneNumber(input_str) {
    const re = /^\(?(\d{3})\)?[- ]?(\d{3})[- ]?(\d{4})$/;
    return re.test(input_str);
}

const validateUserInputs = async ({
    firstName,
    lastName,
    email,
    username,
    password,
    phoneNumber,
    country,
}) => {
    const errorsList = [];

    // Validate firstName
    if (!firstName) errorsList.push('first name is required');
    else if (firstName.length < 3)
        errorsList.push('The first name must be at least 4 characters long.');
    else if (firstName.length > 64)
        errorsList.push('The first name must not exceed 64 characters.');

    // Validate lastName
    if (!lastName) errorsList.push('last name is required');
    else if (lastName.length < 3)
        errorsList.push('The last name must be at least 4 characters long.');
    else if (lastName.length > 64)
        errorsList.push('The last name must not exceed 64 characters.');

    // Validate username
    if (!username) errorsList.push('Username is required');
    else if (!USERNAME_REGEX.test(username))
        errorsList.push('Username can only contain letters, numbers, dots, underscores, and hyphens.');
    else if (username.length < 3 || username.length > 30)
        errorsList.push('Username must be between 3 and 30 characters.');
    else if (await UsernameExists(username))
        errorsList.push('This username is taken');

    // Validate email
    if (!email) errorsList.push('Email address is required');
    else if (!validateEmail(email))
        errorsList.push('The email address format is invalid.');
    else if (await UserExists(email))
        errorsList.push('A user with this email already exists');

    // Validate password
    if (!password) errorsList.push('Password is required.');
    else if (
        !/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[$@#&!]).{8,}$/.test(password)
    )
        errorsList.push(
            'Password must be at least 8 characters long and include a number, an uppercase letter, a lowercase letter, and a special character ($, @, #, &, or !).'
        );

    // Validate phone number
    if (!phoneNumber) errorsList.push('Phone number is required.');
    else if (!validatePhoneNumber(phoneNumber))
        errorsList.push('The phone number format is invalid.');

    // Validate country
    if (!country) errorsList.push('Country is required.');

    return errorsList;
};

const defaultExport = { validateEmail, UserExists, UsernameExists, validatePhoneNumber, validateUserInputs };

export { validateEmail, UserExists, UsernameExists, validatePhoneNumber, validateUserInputs };
export default defaultExport;
