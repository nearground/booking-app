import React from 'react';

const getInitials = (member) => {
  const fullName = `${member?.firstName || ''} ${member?.lastName || ''}`.trim();
  if (!fullName) {
    return 'U';
  }

  return fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
};

const getInviteExpiryMeta = (expiresAt) => {
  const expiresTimestamp = new Date(expiresAt).getTime();
  const hoursRemaining = Math.round((expiresTimestamp - Date.now()) / (1000 * 60 * 60));

  if (!Number.isFinite(hoursRemaining)) {
    return {
      label: 'Expiration unavailable',
      classes: 'bg-slate-100 text-slate-600',
    };
  }

  if (hoursRemaining <= 48) {
    return {
      label: `Expires ${new Date(expiresAt).toLocaleString()}`,
      classes: 'bg-amber-100 text-amber-700',
    };
  }

  return {
    label: `Expires ${new Date(expiresAt).toLocaleDateString()}`,
    classes: 'bg-emerald-100 text-emerald-700',
  };
};

/**
 * Renders organization details, members, and invite management for the selected workspace organization.
 */
const OrgMembersPanel = ({
  organizations,
  organization,
  selectedOrganizationId,
  onSelectOrganization,
  isAdmin,
  locations,
  orgEdit,
  onOrgFieldChange,
  onSaveOrganization,
  inviteForm,
  onInviteFieldChange,
  onCreateInvite,
  onResendInvite,
  onCancelInvite,
  onCopyInviteValue,
}) => {
  if (!organization) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-600 shadow-sm">
        No organization workspace is available yet.
      </div>
    );
  }

  const members = organization.members || [];
  const pendingInvites = organization.pendingInvites || [];
  const activeLocation =
    locations.find((location) => String(location.id) === String(orgEdit?.locationId || organization.LocationId || '')) ||
    organization.Location ||
    null;

  return (
    <div className="space-y-6">
      {organizations.length > 1 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <label htmlFor="organization-members-select" className="block text-sm font-semibold text-slate-800">
            Organization
          </label>
          <p className="mt-1 text-sm text-slate-500">Switch between organization workspaces.</p>
          <select
            id="organization-members-select"
            className="mt-3 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-700"
            value={selectedOrganizationId || ''}
            onChange={(event) => onSelectOrganization(event.target.value)}
          >
            {organizations.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Organization</p>
            <h3 className="mt-2 text-2xl font-semibold text-slate-900">{organization.name}</h3>
            <p className="mt-2 text-sm text-slate-600">
              {organization.email || 'No organization email provided'}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {activeLocation?.name
                ? `${activeLocation.name}${activeLocation.city ? ` · ${activeLocation.city}` : ''}`
                : 'No headquarters location assigned'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 md:min-w-[220px]">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Members</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">{members.length}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Pending Invites</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">{pendingInvites.length}</p>
            </div>
          </div>
        </div>

        {isAdmin ? (
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <label className="block text-sm font-medium text-slate-700">
              <span className="mb-2 block">Organization name</span>
              <input
                className="w-full rounded-2xl border border-slate-300 px-4 py-3"
                value={orgEdit?.name || ''}
                onChange={(event) => onOrgFieldChange('name', event.target.value)}
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              <span className="mb-2 block">Organization email</span>
              <input
                className="w-full rounded-2xl border border-slate-300 px-4 py-3"
                value={orgEdit?.email || ''}
                onChange={(event) => onOrgFieldChange('email', event.target.value)}
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              <span className="mb-2 block">Headquarters location</span>
              <select
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3"
                value={orgEdit?.locationId || ''}
                onChange={(event) => onOrgFieldChange('locationId', event.target.value)}
              >
                <option value="">No location assigned</option>
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name || 'Location'} - {location.city}, {location.country}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ) : null}

        {isAdmin ? (
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              className="rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white"
              onClick={onSaveOrganization}
            >
              Save Organization
            </button>
          </div>
        ) : null}
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h4 className="text-lg font-semibold text-slate-900">Members ({members.length})</h4>
            <p className="mt-1 text-sm text-slate-500">Everyone currently assigned to this organization.</p>
          </div>
        </div>

        {members.length > 0 ? (
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {members.map((member) => (
              <div
                key={member.id}
                className="rounded-3xl border border-slate-200 bg-slate-50 p-4 transition-shadow hover:shadow-md"
              >
                <div className="flex items-center gap-3">
                  {member.profilePicture ? (
                    <img
                      src={member.profilePicture}
                      alt={`${member.firstName || ''} ${member.lastName || ''}`.trim() || 'Organization member'}
                      className="h-12 w-12 rounded-2xl object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-200 font-semibold text-slate-700">
                      {getInitials(member)}
                    </div>
                  )}

                  <div>
                    <p className="font-semibold text-slate-900">
                      {`${member.firstName || ''} ${member.lastName || ''}`.trim() || 'Unnamed member'}
                    </p>
                    <p className="text-sm text-slate-500">{member.email}</p>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${member.isAdmin ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700'}`}>
                    {member.isAdmin ? 'Admin' : 'Member'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-5 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
            No members have been assigned yet.
          </div>
        )}
      </div>

      {isAdmin ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h4 className="text-lg font-semibold text-slate-900">Invite Members</h4>
              <p className="mt-1 text-sm text-slate-500">Invite admins or members and manage any pending invitations.</p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-4">
            <label className="block text-sm font-medium text-slate-700 md:col-span-2">
              <span className="mb-2 block">Email</span>
              <input
                className="w-full rounded-2xl border border-slate-300 px-4 py-3"
                type="email"
                value={inviteForm?.email || ''}
                onChange={(event) => onInviteFieldChange('email', event.target.value)}
                placeholder="teammate@example.com"
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              <span className="mb-2 block">Role</span>
              <select
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3"
                value={inviteForm?.role || 'member'}
                onChange={(event) => onInviteFieldChange('role', event.target.value)}
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
            </label>
            <label className="block text-sm font-medium text-slate-700">
              <span className="mb-2 block">Expires in days</span>
              <input
                className="w-full rounded-2xl border border-slate-300 px-4 py-3"
                type="number"
                min={1}
                max={30}
                value={inviteForm?.expiresInDays || 7}
                onChange={(event) => onInviteFieldChange('expiresInDays', event.target.value)}
              />
            </label>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              type="button"
              className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white"
              onClick={onCreateInvite}
            >
              Send Invite
            </button>
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between gap-3">
              <h5 className="text-base font-semibold text-slate-900">Pending Invites ({pendingInvites.length})</h5>
            </div>

            {pendingInvites.length > 0 ? (
              <div className="mt-4 space-y-3">
                {pendingInvites.map((invite) => {
                  const expiryMeta = getInviteExpiryMeta(invite.expiresAt);

                  return (
                    <div key={invite.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-slate-900">{invite.email}</p>
                            <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                              {invite.role === 'admin' ? 'Admin invite' : 'Member invite'}
                            </span>
                            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${expiryMeta.classes}`}>
                              {expiryMeta.label}
                            </span>
                          </div>
                          <p className="mt-2 break-all text-sm text-slate-500">{invite.inviteUrl}</p>
                          <p className="mt-1 text-sm text-slate-500">Code: <span className="font-mono">{invite.code}</span></p>
                        </div>

                        <div className="flex flex-wrap gap-2 lg:justify-end">
                          <button
                            type="button"
                            className="rounded-full border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700"
                            onClick={() => onCopyInviteValue(invite.inviteUrl, 'Invite link copied.')}
                          >
                            Copy Link
                          </button>
                          <button
                            type="button"
                            className="rounded-full border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700"
                            onClick={() => onCopyInviteValue(invite.code, 'Invite code copied.')}
                          >
                            Copy Code
                          </button>
                          <button
                            type="button"
                            className="rounded-full bg-blue-600 px-3 py-1.5 text-sm font-medium text-white"
                            onClick={() => onResendInvite(invite.id)}
                          >
                            Resend
                          </button>
                          <button
                            type="button"
                            className="rounded-full bg-rose-600 px-3 py-1.5 text-sm font-medium text-white"
                            onClick={() => onCancelInvite(invite.id)}
                          >
                            Cancel Invite
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="mt-4 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
                No pending invites. Send one to grow your organization.
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default OrgMembersPanel;