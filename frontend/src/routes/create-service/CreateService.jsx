import { useContext, useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { AuthContext } from 'contexts/AuthContext';
import { networkAdapter } from 'services/NetworkAdapter';

const DEFAULT_FORM_STATE = {
  organizationId: '',
  locationId: '',
  title: '',
  subtitle: '',
  description: '',
  capacity: '1',
  duration: '60',
  scheduling: '',
};

const CreateService = () => {
  const navigate = useNavigate();
  const { userDetails } = useContext(AuthContext);

  const [formData, setFormData] = useState(DEFAULT_FORM_STATE);
  const [locations, setLocations] = useState([]);
  const [errors, setErrors] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasOrganizerProfile = Boolean(userDetails?.organizerProfile);

  const adminOrganizations = useMemo(
    () => (userDetails?.organizations || []).filter((organization) => organization.isAdmin),
    [userDetails?.organizations]
  );

  useEffect(() => {
    if (!adminOrganizations.length) {
      return;
    }

    setFormData((previous) => {
      if (previous.organizationId) {
        return previous;
      }

      const organizationId = String(adminOrganizations[0].id);
      const locationId = adminOrganizations[0].LocationId ? String(adminOrganizations[0].LocationId) : '';

      return {
        ...previous,
        organizationId,
        locationId,
      };
    });
  }, [adminOrganizations]);

  useEffect(() => {
    const loadLocations = async () => {
      const response = await networkAdapter.get('/api/organizers/onboarding/meta');
      if (response?.errors?.length) {
        return;
      }

      setLocations(Array.isArray(response?.data?.locations) ? response.data.locations : []);
    };

    loadLocations();
  }, []);

  const selectedOrganization = useMemo(
    () =>
      adminOrganizations.find(
        (organization) => String(organization.id) === String(formData.organizationId)
      ) || null,
    [adminOrganizations, formData.organizationId]
  );

  const organizationLocations = useMemo(() => {
    if (!selectedOrganization) {
      return [];
    }

    return locations.filter(
      (location) => String(location.OrganizationId) === String(selectedOrganization.id)
    );
  }, [locations, selectedOrganization]);

  useEffect(() => {
    if (!selectedOrganization) {
      return;
    }

    const hasSelectedLocation = organizationLocations.some(
      (location) => String(location.id) === String(formData.locationId)
    );

    if (hasSelectedLocation) {
      return;
    }

    const fallbackLocationId = selectedOrganization.LocationId || organizationLocations[0]?.id || '';

    setFormData((previous) => ({
      ...previous,
      locationId: fallbackLocationId ? String(fallbackLocationId) : '',
    }));
  }, [formData.locationId, organizationLocations, selectedOrganization]);

  if (!hasOrganizerProfile) {
    return <Navigate to="/organizer-profile" replace />;
  }

  const updateField = (field, value) => {
    setFormData((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const validate = () => {
    const validationErrors = [];

    if (!formData.organizationId) {
      validationErrors.push('Please select an organization.');
    }

    if (!formData.locationId) {
      validationErrors.push('Please select a location.');
    }

    if (!String(formData.title || '').trim()) {
      validationErrors.push('Title is required.');
    }

    const capacity = Number(formData.capacity);
    if (!Number.isInteger(capacity) || capacity <= 0) {
      validationErrors.push('Capacity must be a positive integer.');
    }

    const duration = Number(formData.duration);
    if (!Number.isInteger(duration) || duration <= 0) {
      validationErrors.push('Duration must be a positive integer in minutes.');
    }

    return validationErrors;
  };

  const onSubmit = async (event) => {
    event.preventDefault();

    const validationErrors = validate();
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);
    setErrors([]);

    const response = await networkAdapter.post('/api/services/manage', {
      organizationId: Number(formData.organizationId),
      locationId: Number(formData.locationId),
      title: String(formData.title || '').trim(),
      subtitle: String(formData.subtitle || '').trim(),
      description: String(formData.description || '').trim(),
      capacity: Number(formData.capacity),
      duration: Number(formData.duration),
      scheduling: String(formData.scheduling || '').trim() || null,
    });

    if (response?.errors?.length) {
      setErrors(response.errors);
      setIsSubmitting(false);
      return;
    }

    navigate('/organizer-profile');
  };

  return (
    <div className="container mx-auto p-4 md:p-6 min-h-[700px]">
      <h2 className="text-2xl md:text-3xl font-extrabold text-brand mb-2">Create Service</h2>
      <p className="text-slate-600 mb-6">
        Create a service template and optionally provide a schedule cron expression for automatic slot generation.
      </p>

      {errors.length > 0 && (
        <div className="mb-4 border border-red-200 bg-red-50 rounded p-3">
          <ul className="text-sm text-red-700 list-disc list-inside">
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      <form className="bg-white rounded shadow-md p-4 md:p-6 space-y-4" onSubmit={onSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="text-sm text-slate-700">
            Organization
            <select
              className="border rounded px-3 py-2 w-full mt-1"
              value={formData.organizationId}
              onChange={(event) => updateField('organizationId', event.target.value)}
            >
              <option value="">Select organization</option>
              {adminOrganizations.map((organization) => (
                <option key={organization.id} value={organization.id}>
                  {organization.name}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm text-slate-700">
            Location
            <select
              className="border rounded px-3 py-2 w-full mt-1"
              value={formData.locationId}
              onChange={(event) => updateField('locationId', event.target.value)}
            >
              <option value="">Select location</option>
              {organizationLocations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name || 'Location'} - {location.city}, {location.country}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="text-sm text-slate-700 block">
          Title
          <input
            className="border rounded px-3 py-2 w-full mt-1"
            value={formData.title}
            onChange={(event) => updateField('title', event.target.value)}
            placeholder="Private city tour guide"
          />
        </label>

        <label className="text-sm text-slate-700 block">
          Subtitle
          <input
            className="border rounded px-3 py-2 w-full mt-1"
            value={formData.subtitle}
            onChange={(event) => updateField('subtitle', event.target.value)}
            placeholder="Tailored experiences with local experts"
          />
        </label>

        <label className="text-sm text-slate-700 block">
          Description
          <textarea
            className="border rounded px-3 py-2 w-full mt-1 min-h-28"
            value={formData.description}
            onChange={(event) => updateField('description', event.target.value)}
            placeholder="Describe what is included, preparation, and expectations."
          />
        </label>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="text-sm text-slate-700">
            Capacity
            <input
              type="number"
              min={1}
              className="border rounded px-3 py-2 w-full mt-1"
              value={formData.capacity}
              onChange={(event) => updateField('capacity', event.target.value)}
            />
          </label>

          <label className="text-sm text-slate-700">
            Duration (minutes)
            <input
              type="number"
              min={1}
              className="border rounded px-3 py-2 w-full mt-1"
              value={formData.duration}
              onChange={(event) => updateField('duration', event.target.value)}
            />
          </label>
        </div>

        <label className="text-sm text-slate-700 block">
          Scheduling (cron)
          <input
            className="border rounded px-3 py-2 w-full mt-1"
            value={formData.scheduling}
            onChange={(event) => updateField('scheduling', event.target.value)}
            placeholder="0 9 * * *"
          />
        </label>

        <div className="flex gap-2">
          <button
            type="submit"
            className="px-4 py-2 rounded bg-brand text-white"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Creating...' : 'Create Service'}
          </button>
          <button
            type="button"
            className="px-4 py-2 rounded bg-slate-200 text-slate-700"
            onClick={() => navigate('/organizer-profile')}
            disabled={isSubmitting}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateService;
