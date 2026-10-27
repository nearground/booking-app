import { useState } from 'react';
import { Link } from 'react-router-dom';
import { networkAdapter } from 'services/NetworkAdapter';
import React, { useContext } from 'react';
import { AuthContext } from 'contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import Toast from 'components/ux/toast/Toast';
import { LOGIN_MESSAGES } from 'utils/constants';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const context = useContext(AuthContext);
  const isDevelopment = process.env.NODE_ENV === 'development';
  const [loginData, setLoginData] = useState({
    username: isDevelopment ? 'user1' : '',
    password: isDevelopment ? 'testpassword' : '',
    organizationUsername: isDevelopment ? 'testcompany1' : '',
  });
  const [isOrganizerLogin, setIsOrganizerLogin] = useState(false);

  const [errorMessage, setErrorMessage] = useState(false);

  const handleInputChange = (e) => {
    setLoginData({ ...loginData, [e.target.name]: e.target.value });
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();

    if (!loginData.username || !loginData.password) {
      setErrorMessage(LOGIN_MESSAGES.FAILED);
      return;
    }

    if (isOrganizerLogin && !loginData.organizationUsername) {
      setErrorMessage('Organization username is required for organizer login');
      return;
    }

    const payload = {
      username: loginData.username,
      password: loginData.password,
      ...(isOrganizerLogin && loginData.organizationUsername
        ? { organizationUsername: loginData.organizationUsername }
        : {}),
    };

    const response = await networkAdapter.post('api/users/login', payload);
    if (response && response.data && response.data.token) {
      const authenticated = await context.triggerAuthCheck();
      if (authenticated) {
        const redirectPath = location.state?.from?.pathname || (location.state?.firstLogin ? '/user-profile?welcome=1' : '/user-profile');
        navigate(redirectPath, { replace: true });
      } else {
        setErrorMessage(LOGIN_MESSAGES.FAILED);
      }
    } else if (response && response.errors && response.errors.length > 0) {
      setErrorMessage(response.errors[0]);
    } else {
      setErrorMessage(LOGIN_MESSAGES.FAILED);
    }
  };

  const dismissError = () => {
    setErrorMessage('');
  };

  return (
    <>
      <div className="login__form">
        <div className="container mx-auto p-4 flex justify-center min-h-[600px] items-center">
          <form
            onSubmit={handleLoginSubmit}
            className="w-full max-w-lg p-4 md:p-10 shadow-md"
          >
            <div className="text-center mb-10">
              <h2 className="text-3xl font-extrabold text-brand">
                Welcome Back
              </h2>
              <p className="text-gray-500">
                Log in to continue to your account
              </p>
            </div>
            <div className="mb-4 flex justify-center">
              <label className="inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isOrganizerLogin}
                  onChange={() => setIsOrganizerLogin(!isOrganizerLogin)}
                  className="sr-only peer"
                />
                <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand" />
                <span className="ms-3 text-sm font-medium text-gray-700">
                  Organizer Login
                </span>
              </label>
            </div>
            {isOrganizerLogin && (
              <div className="mb-6">
                <input
                  type="text"
                  name="organizationUsername"
                  placeholder="Organization Username"
                  value={loginData.organizationUsername}
                  onChange={handleInputChange}
                  className="appearance-none block w-full bg-gray-200 text-gray-700 border rounded py-3 px-4 mb-3 leading-tight focus:outline-none focus:bg-white"
                />
              </div>
            )}
            <div className="mb-6">
              <input
                type="text"
                name="username"
                placeholder="Username"
                value={loginData.username}
                onChange={handleInputChange}
                autoComplete="username"
                className="appearance-none block w-full bg-gray-200 text-gray-700 border rounded py-3 px-4 mb-3 leading-tight focus:outline-none focus:bg-white"
              />
            </div>
            <div className="mb-6">
              <input
                type="password"
                name="password"
                placeholder="Password"
                value={loginData.password}
                onChange={handleInputChange}
                autoComplete="current-password"
                className="appearance-none block w-full bg-gray-200 text-gray-700 border rounded py-3 px-4 leading-tight focus:outline-none focus:bg-white"
              />
            </div>
            {errorMessage && (
              <Toast
                type="error"
                message={errorMessage}
                dismissError={dismissError}
              />
            )}
            <div className="items-center">
              <div>
                <button
                  type="submit"
                  className="bg-brand hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full"
                >
                  Log In
                </button>
              </div>
              <div className="flex flex-wrap justify-center my-3 w-full">
                <Link
                  to="/forgot-password"
                  className="inline-block align-baseline text-md text-gray-500 hover:text-blue-800 text-right"
                >
                  Forgot your password?
                </Link>
              </div>
              <div className="flex flex-wrap justify-center my-1 w-full">
                <Link
                  to="/forgot-username"
                  className="inline-block align-baseline text-md text-gray-500 hover:text-blue-800 text-right"
                >
                  Forgot your username?
                </Link>
              </div>
              <div className="relative">
                <div className="absolute left-0 right-0 flex justify-center items-center">
                  <div className="border-t w-full absolute"></div>
                  <span className="bg-white px-3 text-gray-500 z-10">
                    New to PUERTO VALLARTA TODAY?
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap justify-center my-3 w-full mt-12">
                <Link
                  to="/register"
                  className="inline-block align-baseline font-medium text-md text-brand hover:text-blue-800 text-right"
                >
                  Create an account
                </Link>
              </div>
              <div className="flex flex-wrap justify-center my-1 w-full">
                <Link
                  to="/organizer-signup"
                  className="inline-block align-baseline font-medium text-md text-brand hover:text-blue-800 text-right"
                >
                  Sign up as organizer
                </Link>
              </div>
            </div>
          </form>
        </div>
      </div>
      {process.env.NODE_ENV === 'development' && (
        <div className="bg-slate-50 flex flex-col mx-auto w-full max-w-lg px-4">
          <small className="text-slate-600">test user details</small>
          <small className="text-slate-600">Organization Username: testcompany1</small>
          <small className="text-slate-600">Username: user1</small>
          <small className="text-slate-600">Password: testpassword</small>
        </div>
      )}
    </>
  );
};

export default Login;
