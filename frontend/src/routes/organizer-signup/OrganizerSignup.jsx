import { useEffect, useMemo, useState, useContext } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { networkAdapter } from 'services/NetworkAdapter';
import { getStandardCountryList } from 'utils/countries';
import Toast from 'components/ux/toast/Toast';
import { AuthContext } from 'contexts/AuthContext';

const defaultFormState = {
  mode: 'create',
  firstName: '',
  lastName: '',
  username: '',
  email: '',
  phoneNumber: '',
  country: '',
  password: '',
  confirmPassword: '',
  organizerDescription: '',
  inviteCode: '',
  organizationName: '',
  organizationUsername: '',
  organizationEmail: '',
  organizationLocationId: '',
};

const OrganizerSignup = () => {
  const navigate = useNavigate();
  const authContext = useContext(AuthContext);
  const userDetails = authContext?.userDetails;
  const firstOrganization = userDetails?.organizations?.[0] || null;
  const [searchParams] = useSearchParams();

  const inviteToken = searchParams.get('token') || '';
  const [formData, setFormData] = useState({
    ...defaultFormState,
    mode: inviteToken ? 'invite' : 'create',
  });

  const [locations, setLocations] = useState([]);
  const [invitePreview, setInvitePreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastType, setToastType] = useState('error');
  const [toastMessage, setToastMessage] = useState('');

  const countryOptions = useMemo(() => getStandardCountryList(), []);

  const showToast = (type, message) => {
    setToastType(type);
    setToastMessage(message);
  };

  const dismissToast = () => {
    setToastMessage('');
  };

  const setField = (fieldName, value) => {
    setFormData((prev) => ({ ...prev, [fieldName]: value }));
  };

  useEffect(() => {
    const loadMeta = async () => {
      const response = await networkAdapter.get('/api/organizers/onboarding/meta');
      if (response?.data?.locations) {
        setLocations(response.data.locations);
      }
    };

    loadMeta();
  }, []);

  useEffect(() => {
    if (!userDetails) {
      return;
    }

    setFormData((previous) => ({
      ...previous,
      firstName: previous.firstName || userDetails.firstName || '',
      lastName: previous.lastName || userDetails.lastName || '',
      email: previous.email || userDetails.email || '',
      phoneNumber: previous.phoneNumber || userDetails.phoneNumber || '',
      country: previous.country || userDetails.country || '',
      organizerDescription:
        previous.organizerDescription ||
        userDetails.organizerProfile?.description ||
        '',
      organizationName:
        previous.organizationName ||
        firstOrganization?.name ||
        '',
      organizationEmail:
        previous.organizationEmail ||
        firstOrganization?.email ||
        userDetails.email ||
        '',
    }));
  }, [firstOrganization, userDetails]);

  useEffect(() => {
    const loadInvitePreview = async () => {
      if (!inviteToken || !formData.email) {
        setInvitePreview(null);
        return;
      }

      const response = await networkAdapter.get('/api/organizers/invites/resolve', {
        token: inviteToken,
        email: formData.email,
      });

      if (response?.data?.organization) {
        setInvitePreview(response.data);
      } else {
        setInvitePreview(null);
      }
    };

    loadInvitePreview();
  }, [inviteToken, formData.email]);

  const validateForm = () => {
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.username || !formData.password) {
      return 'Please complete all required user fields.';
    }

    if (!/^[a-z0-9._-]+$/i.test(formData.username) || formData.username.length < 3) {
      return 'Username must be at least 3 characters and can only contain letters, numbers, dots, underscores, and hyphens.';
    }

    if (!formData.phoneNumber || !formData.country) {
      return 'Phone number and country are required.';
    }

    if (formData.password !== formData.confirmPassword) {
      return 'Password and confirm password do not match.';
    }

    if (formData.mode === 'invite' && !inviteToken && !formData.inviteCode) {
      return 'Provide an invite code or use an invite URL token.';
    }

    if (formData.mode === 'create') {
      if (!formData.organizationName || !formData.organizationEmail) {
        return 'Organization name and organization email are required.';
      }
      if (!formData.organizationUsername || formData.organizationUsername.length < 3) {
        return 'Organization username must be at least 3 characters.';
      }
    }

    return '';
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      showToast('error', validationError);
      return;
    }

    setIsSubmitting(true);

    const payload = {
      mode: formData.mode,
      firstName: formData.firstName,
      lastName: formData.lastName,
      username: formData.username,
      email: formData.email,
      phoneNumber: formData.phoneNumber,
      country: formData.country,
      password: formData.password,
      organizerDescription: formData.organizerDescription,
      ...(formData.mode === 'invite'
        ? {
            inviteToken: inviteToken || undefined,
            inviteCode: formData.inviteCode || undefined,
          }
        : {
            organization: {
              name: formData.organizationName,
              organizationUsername: formData.organizationUsername,
              email: formData.organizationEmail,
              ...(formData.organizationLocationId
                ? { locationId: Number(formData.organizationLocationId) }
                : {}),
            },
          }),
    };

    const response = await networkAdapter.post('/api/organizers/onboarding/complete', payload);

    setIsSubmitting(false);

    if (response?.errors?.length) {
      showToast('error', response.errors[0]);
      return;
    }

    showToast('success', 'Organizer account created. Redirecting to organizer profile...');
    await authContext.triggerAuthCheck();
    setTimeout(() => {
      navigate('/organizer-profile');
    }, 1000);
  };

  return (
    <div className="container mx-auto p-4 flex justify-center min-h-[640px] items-center">
      <form onSubmit={handleSubmit} className="w-full max-w-2xl p-6 md:p-8 shadow-md">
        <div className="mb-6 text-center">
          <h2 className="text-3xl font-extrabold text-brand">Organizer Sign Up</h2>
          <p className="text-gray-500 mt-2">Join by invite code/link or create a new organization.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <input className="border rounded px-3 py-2" placeholder="First Name *" value={formData.firstName} onChange={(event) => setField('firstName', event.target.value)} />
          <input className="border rounded px-3 py-2" placeholder="Last Name *" value={formData.lastName} onChange={(event) => setField('lastName', event.target.value)} />
          <input className="border rounded px-3 py-2 md:col-span-2" placeholder="Username *" value={formData.username} onChange={(event) => setField('username', event.target.value)} />
          <input className="border rounded px-3 py-2" placeholder="Email *" type="email" value={formData.email} onChange={(event) => setField('email', event.target.value)} />
          <input className="border rounded px-3 py-2" placeholder="Phone Number *" value={formData.phoneNumber} onChange={(event) => setField('phoneNumber', event.target.value)} />

          <select className="border rounded px-3 py-2" value={formData.country} onChange={(event) => setField('country', event.target.value)}>
            <option value="">Select Country *</option>
            {countryOptions.map((countryOption) => (
              <option key={countryOption.code} value={countryOption.name}>
                {countryOption.name}
              </option>
            ))}
          </select>

          <input className="border rounded px-3 py-2" placeholder="Password *" type="password" value={formData.password} onChange={(event) => setField('password', event.target.value)} />
          <input className="border rounded px-3 py-2 md:col-span-2" placeholder="Confirm Password *" type="password" value={formData.confirmPassword} onChange={(event) => setField('confirmPassword', event.target.value)} />
        </div>

        <div className="mb-4">
          <textarea
            className="border rounded px-3 py-2 w-full min-h-28"
            placeholder="Organizer profile text (optional, can be updated later)"
            value={formData.organizerDescription}
            onChange={(event) => setField('organizerDescription', event.target.value)}
          />
        </div>

        <div className="mb-4 border rounded p-4 bg-slate-50">
          {firstOrganization && (
            <p className="text-sm text-slate-700 mb-3">
              Your account is linked to <span className="font-semibold">{firstOrganization.name}</span>.
            </p>
          )}
          <div className="mb-4 flex flex-col md:flex-row gap-2">
            <button
              type="button"
              className={`px-4 py-2 rounded font-medium ${formData.mode === 'create' ? 'bg-brand text-white' : 'bg-white text-slate-700 border border-slate-300'}`}
              onClick={() => setField('mode', 'create')}
              disabled={Boolean(inviteToken)}
            >
              Create Organization
            </button>
            <button
              type="button"
              className={`px-4 py-2 rounded font-medium ${formData.mode === 'invite' ? 'bg-brand text-white' : 'bg-white text-slate-700 border border-slate-300'}`}
              onClick={() => setField('mode', 'invite')}
            >
              Join by Invite
            </button>
          </div>

          {formData.mode === 'invite' ? (
            <div>
              <h3 className="font-semibold text-slate-700 mb-2">Invite Details</h3>
              {!inviteToken && (
                <input
                  className="border rounded px-3 py-2 w-full"
                  placeholder="Invite Code *"
                  value={formData.inviteCode}
                  onChange={(event) => setField('inviteCode', event.target.value.toUpperCase())}
                />
              )}
              {inviteToken && <p className="text-sm text-slate-600">Invite token detected from URL.</p>}
              {invitePreview?.organization && (
                <p className="text-sm text-green-700 mt-2">
                  Joining organization: <span className="font-semibold">{invitePreview.organization.name}</span>
                </p>
              )}
            </div>
          ) : (
            <div>
              <h3 className="font-semibold text-slate-700 mb-2">Organization Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  className="border rounded px-3 py-2"
                  placeholder="Organization Name *"
                  value={formData.organizationName}
                  onChange={(event) => {
                    const name = event.target.value;
                    setField('organizationName', name);
                    if (!formData.organizationUsername || formData.organizationUsername === formData.organizationName.toLowerCase().replace(/[^a-z0-9]/g, '')) {
                      setField('organizationUsername', name.toLowerCase().replace(/[^a-z0-9]/g, ''));
                    }
                  }}
                />
                <input
                  className="border rounded px-3 py-2"
                  placeholder="Organization Username *"
                  value={formData.organizationUsername}
                  onChange={(event) => setField('organizationUsername', event.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))}
                />
                <input
                  className="border rounded px-3 py-2"
                  placeholder="Organization Email *"
                  type="email"
                  value={formData.organizationEmail}
                  onChange={(event) => setField('organizationEmail', event.target.value)}
                />
                <select
                  className="border rounded px-3 py-2 md:col-span-2"
                  value={formData.organizationLocationId}
                  onChange={(event) => setField('organizationLocationId', event.target.value)}
                >
                  <option value="">Select Organization Location (optional)</option> {/* TODO: Actually implement this */}
                  {locations.map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.name || 'Location'} - {location.city}, {location.state}, {location.country}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {toastMessage && <Toast type={toastType} message={toastMessage} dismissError={dismissToast} />}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full px-4 py-2 font-bold text-white rounded bg-brand hover:bg-emerald-700 disabled:opacity-50"
        >
          {isSubmitting ? 'Submitting...' : 'Create Organizer Account'}
        </button>

        <div className="mt-4 text-center text-sm text-slate-600">
          Already have an account? <Link to="/login" className="text-brand">Log in</Link>
        </div>
      </form>
    </div>
  );
};

export default OrganizerSignup;
