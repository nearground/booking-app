import { useCallback, useMemo, useState } from 'react';
import { networkAdapter } from 'services/NetworkAdapter';
import { getStandardCountryList } from 'utils/countries';

const emptyLocationForm = {
  name: '',
  country: '',
  state: '',
  city: '',
  street: '',
  zipCode: '',
  notes: '',
  latitude: '',
  longitude: '',
  timezone: '',
};

const LocationsPanel = ({ locations, organizations, onLocationsChanged, showToast }) => {
  const [editingLocationId, setEditingLocationId] = useState(null);
  const [editingLocationOrganizationId, setEditingLocationOrganizationId] = useState(null);
  const [editForm, setEditForm] = useState({ ...emptyLocationForm });
  const [isCreating, setIsCreating] = useState(false);
  const [createForm, setCreateForm] = useState({ ...emptyLocationForm, organizationId: '' });
  const [isSaving, setIsSaving] = useState(false);
  const countryOptions = useMemo(() => getStandardCountryList(), []);

  const adminOrganizations = useMemo(
    () => (organizations || []).filter((org) => org.isAdmin !== false),
    [organizations]
  );

  const startEditing = useCallback((location) => {
    const coords = location.coordinates?.coordinates;
    setEditingLocationId(location.id);
    setEditingLocationOrganizationId(location.OrganizationId);
    setEditForm({
      name: location.name || '',
      country: location.country || '',
      state: location.state || '',
      city: location.city || '',
      street: location.street || '',
      zipCode: location.zipCode || '',
      notes: location.notes || '',
      latitude: Array.isArray(coords) ? String(coords[1]) : '',
      longitude: Array.isArray(coords) ? String(coords[0]) : '',
      timezone: location.timezone || '',
    });
  }, []);

  const cancelEditing = () => {
    setEditingLocationId(null);
    setEditingLocationOrganizationId(null);
    setEditForm({ ...emptyLocationForm });
  };

  const saveEdit = async (location) => {
    const organizationId = location.OrganizationId;
    if (!organizationId) {
      showToast('error', 'Location is not assigned to an organization.');
      return;
    }

    setIsSaving(true);
    const payload = {
      name: editForm.name,
      country: editForm.country,
      state: editForm.state,
      city: editForm.city,
      street: editForm.street,
      zipCode: editForm.zipCode,
      notes: editForm.notes || null,
      timezone: editForm.timezone || null,
    };

    const lat = Number(editForm.latitude);
    const lon = Number(editForm.longitude);
    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      payload.latitude = lat;
      payload.longitude = lon;
    }

    const response = await networkAdapter.patch(
      `/api/organizers/organizations/${organizationId}/locations/${location.id}`,
      payload
    );
    setIsSaving(false);

    if (response?.errors?.length) {
      showToast('error', response.errors[0]);
      return;
    }

    showToast('success', 'Location updated.');
    setEditingLocationId(null);
    setEditingLocationOrganizationId(null);
    onLocationsChanged();
  };

  const deleteLocation = async (location) => {
    const organizationId = location.OrganizationId;
    if (!organizationId) {
      showToast('error', 'Location is not assigned to an organization.');
      return;
    }

    setIsSaving(true);
    const response = await networkAdapter.delete(
      `/api/organizers/organizations/${organizationId}/locations/${location.id}`
    );
    setIsSaving(false);

    if (response?.errors?.length) {
      showToast('error', response.errors[0]);
      return;
    }

    showToast('success', 'Location deleted.');
    onLocationsChanged();
  };

  const createLocation = async () => {
    const orgId = Number(createForm.organizationId);
    if (!Number.isInteger(orgId)) {
      showToast('error', 'Select an organization.');
      return;
    }

    const requiredFields = ['name', 'country', 'state', 'city', 'street', 'zipCode'];
    const hasMissing = requiredFields.some(
      (field) => !String(createForm[field] || '').trim()
    );
    if (hasMissing) {
      showToast('error', 'Please fill all required fields.');
      return;
    }

    const lat = Number(createForm.latitude);
    const lon = Number(createForm.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      showToast('error', 'Latitude and longitude are required.');
      return;
    }

    setIsSaving(true);
    const response = await networkAdapter.post(
      `/api/organizers/organizations/${orgId}/locations`,
      {
        name: createForm.name,
        country: createForm.country,
        state: createForm.state,
        city: createForm.city,
        street: createForm.street,
        zipCode: createForm.zipCode,
        notes: createForm.notes || null,
        latitude: lat,
        longitude: lon,
        timezone: createForm.timezone || null,
      }
    );
    setIsSaving(false);

    if (response?.errors?.length) {
      showToast('error', response.errors[0]);
      return;
    }

    showToast('success', 'Location created.');
    setIsCreating(false);
    setCreateForm({ ...emptyLocationForm, organizationId: '' });
    onLocationsChanged();
  };

  const renderLocationForm = (form, setField, isCreate) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
      {isCreate && (
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-slate-700 mb-0.5">Organization *</label>
          <select
            className="border rounded px-3 py-1.5 w-full"
            value={form.organizationId || ''}
            onChange={(e) => setField('organizationId', e.target.value)}
          >
            <option value="">Select organization</option>
            {adminOrganizations.map((org) => (
              <option key={org.id} value={org.id}>{org.name}</option>
            ))}
          </select>
        </div>
      )}
      <div>
        <label className="block text-xs font-medium text-slate-700 mb-0.5">Name *</label>
        <input className="border rounded px-3 py-1.5 w-full" value={form.name} onChange={(e) => setField('name', e.target.value)} />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-700 mb-0.5">Country *</label>
        <select className="border rounded px-3 py-1.5 w-full" value={form.country} onChange={(e) => setField('country', e.target.value)}>
          <option value="">Select country</option>
          {countryOptions.map((opt) => (
            <option key={opt.code} value={opt.name}>{opt.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-700 mb-0.5">State *</label>
        <input className="border rounded px-3 py-1.5 w-full" value={form.state} onChange={(e) => setField('state', e.target.value)} />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-700 mb-0.5">City *</label>
        <input className="border rounded px-3 py-1.5 w-full" value={form.city} onChange={(e) => setField('city', e.target.value)} />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-700 mb-0.5">Street *</label>
        <input className="border rounded px-3 py-1.5 w-full" value={form.street} onChange={(e) => setField('street', e.target.value)} />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-700 mb-0.5">Zip code *</label>
        <input className="border rounded px-3 py-1.5 w-full" value={form.zipCode} onChange={(e) => setField('zipCode', e.target.value)} />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-700 mb-0.5">Latitude *</label>
        <input className="border rounded px-3 py-1.5 w-full" type="number" step="any" value={form.latitude} onChange={(e) => setField('latitude', e.target.value)} />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-700 mb-0.5">Longitude *</label>
        <input className="border rounded px-3 py-1.5 w-full" type="number" step="any" value={form.longitude} onChange={(e) => setField('longitude', e.target.value)} />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-700 mb-0.5">Timezone</label>
        <input className="border rounded px-3 py-1.5 w-full" value={form.timezone} onChange={(e) => setField('timezone', e.target.value)} placeholder="e.g. America/New_York" />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-700 mb-0.5">Notes</label>
        <input className="border rounded px-3 py-1.5 w-full" value={form.notes} onChange={(e) => setField('notes', e.target.value)} />
      </div>
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-800">Locations</h3>
        {!isCreating && (
          <button
            type="button"
            className="px-3 py-1.5 rounded bg-brand text-white text-sm"
            onClick={() => {
              setIsCreating(true);
              setEditingLocationId(null);
              setEditingLocationOrganizationId(null)
              setCreateForm({ ...emptyLocationForm, organizationId: adminOrganizations.length === 1 ? String(adminOrganizations[0].id) : '' });
            }}
          >
            Add Location
          </button>
        )}
      </div>

      {isCreating && (
        <div className="border border-slate-200 rounded p-3 bg-slate-50 mb-4">
          <p className="text-sm font-medium text-slate-700 mb-2">New Location</p>
          {renderLocationForm(
            createForm,
            (field, value) => setCreateForm((prev) => ({ ...prev, [field]: value })),
            true
          )}
          <div className="flex gap-2 mt-3">
            <button type="button" className="px-3 py-1.5 rounded bg-brand text-white text-sm" onClick={createLocation} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Create'}
            </button>
            <button type="button" className="px-3 py-1.5 rounded border border-slate-300 text-slate-700 text-sm" onClick={() => setIsCreating(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {locations.length === 0 && !isCreating && (
        <p className="text-sm text-slate-500">You haven't registered a location yet.</p>
      )}

      <div className="space-y-3">
        {locations.map((location) => {
          const isEditing = editingLocationId === location.id;
          const orgName = (organizations || []).find((o) => o.id === location.OrganizationId)?.name;

          return (
            <div key={location.id} className="border border-slate-200 rounded bg-white p-3">
              {isEditing ? (
                <>
                  {renderLocationForm(
                    editForm,
                    (field, value) => setEditForm((prev) => ({ ...prev, [field]: value })),
                    false
                  )}
                  <div className="flex gap-2 mt-3">
                    <button type="button" className="px-3 py-1.5 rounded bg-brand text-white text-sm" onClick={() => saveEdit(location)} disabled={isSaving}>
                      {isSaving ? 'Saving...' : 'Save'}
                    </button>
                    <button type="button" className="px-3 py-1.5 rounded border border-slate-300 text-slate-700 text-sm" onClick={cancelEditing}>
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{location.name || 'Unnamed location'}</p>
                    <p className="text-xs text-slate-600 mt-0.5">
                      {location.street}, {location.city}, {location.state}, {location.zipCode}, {location.country}
                    </p>
                    {location.timezone && (
                      <p className="text-xs text-slate-500 mt-0.5">Timezone: {location.timezone}</p>
                    )}
                    {orgName && (
                      <p className="text-xs text-slate-500 mt-0.5">Organization: {orgName}</p>
                    ) || <p className="text-xs text-slate-500 mt-0.5">Organization: orgName not found</p>}
                  </div>
                  <div className="flex gap-2">
                    <button type="button" className="px-3 py-1.5 rounded border border-slate-300 text-slate-700 text-sm" onClick={() => startEditing(location)}>
                      Edit
                    </button>
                    <button type="button" className="px-3 py-1.5 rounded border border-red-300 text-red-700 text-sm" onClick={() => deleteLocation(location)} disabled={isSaving}>
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default LocationsPanel;
