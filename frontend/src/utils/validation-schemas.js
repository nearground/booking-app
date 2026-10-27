import * as Yup from 'yup';
import { getStandardCountryNameSet } from './countries';
const phoneRegExp = /^\d{10}$/;
const validCountryNames = getStandardCountryNameSet();

class ValidationSchema {
  static email = Yup.string().email('Invalid email').required('Required');
}

class Schemas extends ValidationSchema {
  static signupSchema = Yup.object().shape({
    firstName: Yup.string()
      .min(2, 'Too Short!')
      .max(50, 'Too Long!')
      .required('Required'),
    lastName: Yup.string()
      .min(2, 'Too Short!')
      .max(50, 'Too Long!')
      .required('Required'),
    username: Yup.string()
      .min(3, 'Username must be at least 3 characters')
      .max(30, 'Username must not exceed 30 characters')
      .matches(
        /^[a-z0-9._-]+$/i,
        'Username can only contain letters, numbers, dots, underscores, and hyphens'
      )
      .required('Required'),
    email: ValidationSchema.email,
    phoneNumber: Yup.string()
      .matches(phoneRegExp, 'Phone number is not valid')
      .required('Required'),
    country: Yup.string()
      .trim()
      .required('Required')
      .test(
        'valid-country',
        'Please select a valid country from the list',
        (value) => !value || validCountryNames.has(value.toLowerCase())
      ),
    password: Yup.string()
      .min(8, 'Password is too short - should be 8 chars minimum.')
      .required('Required'),
    confirmPassword: Yup.string().required('Required'),
  });
}

export default Schemas;
