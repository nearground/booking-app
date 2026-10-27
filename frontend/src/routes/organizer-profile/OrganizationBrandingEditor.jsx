import { useCallback, useContext, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AuthContext } from 'contexts/AuthContext';
import { networkAdapter } from 'services/NetworkAdapter';

const initialBranding = {
  slug: '', logoMediaKey: '', coverMediaKey: '', coverMediaType: 'image',
  primaryColor: '#0f766e', accentColor: '#f59e0b', font: 'system', tagline: '', about: '',
  socialLinks: {}, contactLinks: {}, layoutTemplate: 'classic',
};
const normalizeBranding = (data) => Object.fromEntries(Object.keys(initialBranding).map((field) => [field, data?.[field] ?? initialBranding[field]]));
const socialFields = ['website', 'instagram', 'facebook', 'tiktok', 'youtube', 'linkedin', 'x'];
const contactFields = ['email', 'phone', 'whatsapp', 'website'];

const OrganizationBrandingEditor = () => {
  const { organizationId } = useParams();
  const { userDetails } = useContext(AuthContext);
  const [branding, setBranding] = useState(initialBranding);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [previewUrls, setPreviewUrls] = useState({});
  const endpoint = `/api/organization-sites/admin/${organizationId}/branding`;

  useEffect(() => {
    let active = true;
    networkAdapter.get(endpoint).then((response) => {
      if (!active) return;
      if (response.ok && response.data) setBranding(normalizeBranding(response.data));
      else setMessage(response.errors?.[0] || 'Unable to load branding. Only organization admins can edit this site.');
      setLoading(false);
    });
    return () => { active = false; };
  }, [endpoint]);

  const setField = useCallback((field, value) => setBranding((previous) => ({ ...previous, [field]: value })), []);
  const setLink = useCallback((group, field, value) => setBranding((previous) => ({
    ...previous,
    [group]: { ...previous[group], [field]: value },
  })), []);

  const upload = useCallback(async (file, field, kind) => {
    if (!file || !userDetails?.id) return;
    const allowed = kind === 'organization-cover' ? ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif', 'video/mp4'] : ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
    if (!allowed.includes(file.type)) {
      setMessage('Choose a supported image; cover video must be MP4.');
      return;
    }
    const response = await networkAdapter.upload('/api/media/upload', file, {
      method: 'PUT', params: { ownerType: 'user', ownerId: String(userDetails.id), kind },
      headers: { 'Content-Type': file.type },
    });
    if (!response.ok || !response.data?.objectKey) {
      setMessage(response.errors?.[0] || 'Upload failed.');
      return;
    }
    setField(field, response.data.objectKey);
    setPreviewUrls((previous) => ({ ...previous, [field]: response.data.url }));
    if (field === 'coverMediaKey') setField('coverMediaType', file.type === 'video/mp4' ? 'video' : 'image');
    setMessage('Media uploaded. Save to publish the change.');
  }, [setField, userDetails?.id]);

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    const response = await networkAdapter.patch(endpoint, branding);
    setSaving(false);
    if (!response.ok) setMessage(response.errors?.[0] || 'Unable to save branding.');
    else {
      setBranding(normalizeBranding(response.data));
      setMessage('Organization site branding saved.');
    }
  };

  if (loading) return <main className="mx-auto max-w-3xl p-6">Loading branding�</main>;

  return (
    <main className="mx-auto max-w-3xl p-5 md:p-8">
      <Link to="/organizer-profile?tab=Organization" className="text-brand hover:underline">Back to organizer profile</Link>
      <h1 className="mt-4 text-3xl font-bold">Organization site branding</h1>
      <p className="mt-2 text-slate-600">Choose a layout and approved branding. Images and MP4 cover videos use the existing media upload service.</p>
      <form className="mt-6 space-y-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" onSubmit={save}>
        <label className="block">Site slug
          <input required minLength="3" maxLength="63" pattern="[a-z0-9]+(-[a-z0-9]+)*" className="mt-1 w-full rounded border p-2" value={branding.slug || ''} onChange={(event) => setField('slug', event.target.value)} />
        </label>
        <label className="block">Tagline
          <input maxLength="160" className="mt-1 w-full rounded border p-2" value={branding.tagline || ''} onChange={(event) => setField('tagline', event.target.value)} />
        </label>
        <label className="block">About
          <textarea maxLength="4000" rows="5" className="mt-1 w-full rounded border p-2" value={branding.about || ''} onChange={(event) => setField('about', event.target.value)} />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label>Primary color <input type="color" className="mt-1 block h-11 w-full" value={branding.primaryColor || '#0f766e'} onChange={(event) => setField('primaryColor', event.target.value)} /></label>
          <label>Accent color <input type="color" className="mt-1 block h-11 w-full" value={branding.accentColor || '#f59e0b'} onChange={(event) => setField('accentColor', event.target.value)} /></label>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label>Font
            <select className="mt-1 w-full rounded border p-2" value={branding.font || 'system'} onChange={(event) => setField('font', event.target.value)}>
              {['system', 'inter', 'roboto', 'lato', 'montserrat'].map((font) => <option key={font} value={font}>{font}</option>)}
            </select>
          </label>
          <label>Layout template
            <select className="mt-1 w-full rounded border p-2" value={branding.layoutTemplate || 'classic'} onChange={(event) => setField('layoutTemplate', event.target.value)}>
              {['classic', 'editorial', 'immersive'].map((template) => <option key={template} value={template}>{template}</option>)}
            </select>
          </label>
        </div>
        <label className="block">Logo image
          <input type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" className="mt-1 block w-full" onChange={(event) => upload(event.target.files?.[0], 'logoMediaKey', 'organization-logo')} />
          <small className="break-all text-slate-500">{branding.logoMediaKey || 'No logo uploaded'}</small>
          {branding.logoMediaKey ? <button type="button" className="ml-2 text-sm text-red-700" onClick={() => setField('logoMediaKey', '')}>Remove</button> : null}
        </label>
        <label className="block">Cover image or MP4 video
          <input type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif,video/mp4" className="mt-1 block w-full" onChange={(event) => upload(event.target.files?.[0], 'coverMediaKey', 'organization-cover')} />
          <small className="break-all text-slate-500">{branding.coverMediaKey || 'No cover uploaded'}</small>
          {branding.coverMediaKey ? <button type="button" className="ml-2 text-sm text-red-700" onClick={() => setField('coverMediaKey', '')}>Remove</button> : null}
          {previewUrls.coverMediaKey ? <p className="mt-2 text-xs text-slate-500">Uploaded: {previewUrls.coverMediaKey}</p> : null}
        </label>
        <fieldset className="grid gap-4 sm:grid-cols-2"><legend className="mb-2 font-semibold">Social links (HTTPS)</legend>
          {socialFields.map((field) => <label key={field} className="capitalize">{field}<input type="url" className="mt-1 w-full rounded border p-2" value={branding.socialLinks?.[field] || ''} onChange={(event) => setLink('socialLinks', field, event.target.value)} /></label>)}
        </fieldset>
        <fieldset className="grid gap-4 sm:grid-cols-2"><legend className="mb-2 font-semibold">Contact links</legend>
          {contactFields.map((field) => <label key={field} className="capitalize">{field}<input type={field === 'email' ? 'email' : 'text'} className="mt-1 w-full rounded border p-2" value={branding.contactLinks?.[field] || ''} onChange={(event) => setLink('contactLinks', field, event.target.value)} /></label>)}
        </fieldset>
        {message ? <p role="status" className="text-sm text-slate-700">{message}</p> : null}
        <button disabled={saving} className="rounded bg-brand px-5 py-2 font-semibold text-white disabled:opacity-50">{saving ? 'Saving�' : 'Save branding'}</button>
      </form>
    </main>
  );
};

export default OrganizationBrandingEditor;
