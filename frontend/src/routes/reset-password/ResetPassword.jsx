import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { networkAdapter } from 'services/NetworkAdapter';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [tokenStatus, setTokenStatus] = useState('loading'); // loading | valid | expired | invalid
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      setTokenStatus('invalid');
      return;
    }
    const validate = async () => {
      try {
        const resp = await networkAdapter.get(`/api/users/reset-password/${token}`);
        if (resp?.data?.valid) {
          setTokenStatus('valid');
        } else if (resp?.data?.reason === 'expired') {
          setTokenStatus('expired');
        } else {
          setTokenStatus('invalid');
        }
      } catch {
        setTokenStatus('invalid');
      }
    };
    validate();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      const resp = await networkAdapter.post('/api/users/reset-password', { token, newPassword });
      if (resp?.data?.status === 'Password updated') {
        setSuccess(true);
      } else {
        setError(resp?.errors?.[0] || 'Failed to reset password.');
      }
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (tokenStatus === 'loading') {
    return (
      <div className="container mx-auto p-4 flex justify-center min-h-[600px] items-center">
        <p className="text-slate-600">Validating reset link...</p>
      </div>
    );
  }

  if (tokenStatus === 'expired') {
    return (
      <div className="container mx-auto p-4 flex justify-center min-h-[600px] items-center">
        <div className="w-full max-w-lg p-10 shadow-md text-center">
          <h2 className="text-2xl font-semibold text-slate-800 mb-4">Link Expired</h2>
          <p className="text-slate-600 mb-6">This reset link has expired. Please request a new one.</p>
          <Link to="/forgot-password" className="bg-brand hover:bg-emerald-700 text-white font-bold py-2 px-6 rounded">
            Request New Link
          </Link>
        </div>
      </div>
    );
  }

  if (tokenStatus === 'invalid') {
    return (
      <div className="container mx-auto p-4 flex justify-center min-h-[600px] items-center">
        <div className="w-full max-w-lg p-10 shadow-md text-center">
          <h2 className="text-2xl font-semibold text-slate-800 mb-4">Invalid Link</h2>
          <p className="text-slate-600 mb-6">This reset link is invalid.</p>
          <Link to="/forgot-password" className="bg-brand hover:bg-emerald-700 text-white font-bold py-2 px-6 rounded">
            Request New Link
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="container mx-auto p-4 flex justify-center min-h-[600px] items-center">
        <div className="w-full max-w-lg p-10 shadow-md text-center">
          <h2 className="text-2xl font-semibold text-green-700 mb-4">Password Reset Successfully!</h2>
          <p className="text-slate-600 mb-6">You can now log in with your new password.</p>
          <Link to="/login" className="bg-brand hover:bg-emerald-700 text-white font-bold py-2 px-6 rounded">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 flex justify-center min-h-[600px] items-center">
      <form onSubmit={handleSubmit} className="w-full max-w-lg p-4 md:p-10 shadow-md">
        <div className="text-center mb-6">
          <h2 className="text-3xl font-extrabold text-brand my-4">Set New Password</h2>
        </div>
        {error && <p className="text-red-600 text-sm mb-4 text-center">{error}</p>}
        <div className="mb-4">
          <input
            type="password"
            placeholder="New Password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
            className="appearance-none block w-full bg-gray-200 text-gray-700 border rounded py-3 px-4 leading-tight focus:outline-none focus:bg-white"
            required
          />
        </div>
        <div className="mb-6">
          <input
            type="password"
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            className="appearance-none block w-full bg-gray-200 text-gray-700 border rounded py-3 px-4 leading-tight focus:outline-none focus:bg-white"
            required
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-brand hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:opacity-60"
        >
          {submitting ? 'Resetting...' : 'Reset Password'}
        </button>
        <div className="mt-5 text-center">
          <Link to="/login" className="text-gray-500 hover:text-blue-800">Back to login</Link>
        </div>
      </form>
    </div>
  );
};

export default ResetPassword;
