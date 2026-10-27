import { useState } from 'react';
import { Link } from 'react-router-dom';
import { networkAdapter } from 'services/NetworkAdapter';
import validations from 'utils/validations';
import Toast from 'components/ux/toast/Toast';

const ForgotUsername = () => {
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({ email: '' });
  const [errorMessage, setErrorMessage] = useState('');

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const dismissError = () => {
    setErrorMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validations.validate('email', formData.email)) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    const response = await networkAdapter.post(
      '/api/users/lookup-username',
      formData
    );
    if (response) {
      setSuccess(true);
    } else {
      setErrorMessage('Something went wrong. Please try again.');
    }
  };

  return (
    <div>
      <div className="container mx-auto p-4 flex justify-center min-h-[600px] items-center">
        {success ? (
          <div className="bg-white p-6 md:mx-auto">
            <svg
              viewBox="0 0 24 24"
              className="text-green-600 w-16 h-16 mx-auto my-6"
            >
              <path
                fill="currentColor"
                d="M12,0A12,12,0,1,0,24,12,12.014,12.014,0,0,0,12,0Zm6.927,8.2-6.845,9.289a1.011,1.011,0,0,1-1.43.188L5.764,13.769a1,1,0,1,1,1.25-1.562l4.076,3.261,6.227-8.451A1,1,0,1,1,18.927,8.2Z"
              ></path>
            </svg>
            <div className="text-center">
              <h3 className="md:text-2xl text-base text-gray-700 font-semibold text-center">
                Check your email!
              </h3>
              <p className="text-green-500">
                If an account with that email exists, you will receive your
                username(s). Don&apos;t forget to check your spam folder.
              </p>
              <div className="my-6 text-center">
                <Link
                  to="/login"
                  className="px-12 bg-brand hover:bg-indigo-500 text-white font-semibold py-3"
                >
                  GO BACK
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-lg p-4 md:p-10 shadow-md"
          >
            <div className="text-center mb-10">
              <h2 className="text-3xl font-extrabold text-brand my-4">
                Forgot your username?
              </h2>
              <div className="mb-6">
                <input
                  type="email"
                  name="email"
                  placeholder="Email"
                  value={formData.email}
                  onChange={handleInputChange}
                  autoComplete="email"
                  className="appearance-none block w-full bg-gray-200 text-gray-700 border rounded py-3 px-4 mb-3 leading-tight focus:outline-none focus:bg-white"
                />
                <p className="text-gray-700">
                  Enter your email and we&apos;ll send you your username(s) if
                  an account exists.
                </p>
              </div>
              {errorMessage && (
                <Toast
                  type="error"
                  message={errorMessage}
                  dismissError={dismissError}
                />
              )}
              <div className="flex-wrap items-center justify-between">
                <button
                  type="submit"
                  className="w-full bg-brand hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                >
                  Look up username
                </button>
                <div className="mt-5">
                  <Link
                    to="/login"
                    className="inline-block align-baseline text-lg text-gray-500 hover:text-blue-800 text-right"
                  >
                    Back to login
                  </Link>
                </div>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ForgotUsername;
