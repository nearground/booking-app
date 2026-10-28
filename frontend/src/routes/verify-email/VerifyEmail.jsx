import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { networkAdapter } from 'services/NetworkAdapter';

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [state, setState] = useState({ loading: true, error: '', claimedOrderCount: 0 });

  useEffect(() => {
    let mounted = true;
    if (!token) {
      setState({ loading: false, error: 'Verification link is missing a token.', claimedOrderCount: 0 });
      return () => { mounted = false; };
    }

    networkAdapter.post('/api/users/email-verification/confirm', { token }).then((response) => {
      if (!mounted) return;
      if (response?.errors?.length) {
        setState({ loading: false, error: response.errors[0], claimedOrderCount: 0 });
        return;
      }
      setState({ loading: false, error: '', claimedOrderCount: Number(response?.data?.claimedOrderCount || 0) });
    }).catch(() => {
      if (!mounted) return;
      setState({
        loading: false,
        error: 'We could not verify your email. Please try the verification link again.',
        claimedOrderCount: 0,
      });
    });
    return () => { mounted = false; };
  }, [token]);

  if (state.loading) return <p className="mx-auto max-w-lg p-8 text-center">Verifying your email�</p>;

  return (
    <main className="mx-auto max-w-lg p-8 text-center">
      {state.error ? (
        <>
          <h1 className="text-2xl font-semibold">Email verification failed</h1>
          <p role="alert" className="mt-3 text-red-700">{state.error}</p>
        </>
      ) : (
        <>
          <h1 className="text-2xl font-semibold">Email verified</h1>
          <p className="mt-3 text-slate-700">
            {state.claimedOrderCount > 0
              ? `${state.claimedOrderCount} guest booking${state.claimedOrderCount === 1 ? '' : 's'} added to your account. Reservations you opted to share can now appear on the public attendee list.`
              : 'Your email is verified. Guest bookings saved for later can be linked to your account, and reservations you opted to share may appear on the public attendee list after confirmation.'}
          </p>
          <Link className="mt-5 inline-block rounded bg-brand-600 px-4 py-2 text-white" to="/login" state={{ firstLogin: true }}>
            Log in to view bookings
          </Link>
        </>
      )}
    </main>
  );
};

export default VerifyEmail;