import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import PopulateScheduleModal from './PopulateScheduleModal';
import UpdateStartDateModal from './UpdateStartDateModal';

const LookaheadEditor = ({ experienceId, currentDays, updateLookahead }) => {
  const [editing, setEditing] = useState(false);
  const [days, setDays] = useState(currentDays);

  const handleSave = () => {
    const total = Number(days);
    if (!Number.isInteger(total) || total < 1 || total > 730) return;
    updateLookahead(experienceId, total);
    setEditing(false);
  };

  if (!editing) {
    return (
      <button type="button" className="text-brand underline text-xs" onClick={() => setEditing(true)}>
        Edit
      </button>
    );
  }

  return (
    <span className="inline-flex items-center gap-1">
      <input
        type="number"
        min={1}
        max={730}
        value={days}
        onChange={(event) => setDays(event.target.value)}
        className="border rounded px-1 py-0.5 w-16 text-xs"
      />
      <button type="button" className="text-xs text-brand" onClick={handleSave}>Save</button>
      <button type="button" className="text-xs text-slate-400" onClick={() => setEditing(false)}>Cancel</button>
    </span>
  );
};

const getExperienceStatus = (experience) => {
  const upcomingSessions = (experience?.ScheduledExperiences || []).length;

  if (upcomingSessions > 0) {
    return { key: 'active', label: 'Active', classes: 'bg-emerald-100 text-emerald-700' };
  }

  if (experience?.autoSyncEnabled === false) {
    return { key: 'paused', label: 'Paused', classes: 'bg-amber-100 text-amber-700' };
  }

  return { key: 'draft', label: 'Draft', classes: 'bg-slate-200 text-slate-700' };
};

const buildExperienceForm = (experience, currentForm = {}) => ({
  title: currentForm.title ?? experience.title ?? '',
  subtitle: currentForm.subtitle ?? experience.subtitle ?? '',
  description: currentForm.description ?? experience.description ?? '',
  thumbnail: currentForm.thumbnail ?? experience.thumbnail ?? '',
  pendingThumbnailFile: currentForm.pendingThumbnailFile ?? null,
  pendingThumbnailPreviewUrl: currentForm.pendingThumbnailPreviewUrl ?? '',
  capacity: currentForm.capacity ?? experience.capacity ?? '',
  duration: currentForm.duration ?? experience.duration ?? '',
  organizerUserIds:
    currentForm.organizerUserIds ?? (experience.Organizers || []).map((organizer) => organizer.id),
});

/**
 * Renders a searchable experience management panel for the selected organization.
 */
const OrgExperiencesPanel = ({
  organizations,
  organization,
  selectedOrganizationId,
  onSelectOrganization,
  isAdmin,
  experienceEdits,
  setExperienceEdits,
  saveExperienceAssignments,
  saveExperience,
  syncExperienceSchedule,
  toggleAutoSync,
  toggleSessionSyncLock,
  updateLookahead,
  deleteExperience,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedExperienceId, setExpandedExperienceId] = useState(null);
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [populateModalExperienceId, setPopulateModalExperienceId] = useState(null);
  const [populateModalTemplates, setPopulateModalTemplates] = useState([]);
  const [startDateModalExperienceId, setStartDateModalExperienceId] = useState(null);

  if (!organization) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-600 shadow-sm">
        No organization workspace is available yet.
      </div>
    );
  }

  const experiences = organization.Experiences || organization.Events || [];

  const filteredExperiences = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return experiences.filter((experience) => {
      const status = getExperienceStatus(experience);
      const matchesSearch = !normalizedSearch || `${experience.title || ''} ${experience.subtitle || ''}`.toLowerCase().includes(normalizedSearch);
      const matchesStatus = statusFilter === 'all' || status.key === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [experiences, searchTerm, statusFilter]);

  const updateExperienceForm = (experience, patch) => {
    setExperienceEdits((previous) => ({
      ...previous,
      [experience.id]: {
        ...buildExperienceForm(experience, previous[experience.id]),
        ...patch,
      },
    }));
  };

  const handleDeleteExperience = async (experienceId) => {
    const deleted = await deleteExperience(experienceId);
    if (deleted) {
      setDeleteTargetId(null);
      setExpandedExperienceId((current) => (current === experienceId ? null : current));
    }
  };

  return (
    <div className="space-y-6">
      {organizations.length > 1 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <label htmlFor="organization-experiences-select" className="block text-sm font-semibold text-slate-800">
            Organization
          </label>
          <p className="mt-1 text-sm text-slate-500">Switch between organization workspaces.</p>
          <select
            id="organization-experiences-select"
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
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Experiences</p>
            <h3 className="mt-2 text-2xl font-semibold text-slate-900">{organization.name}</h3>
            <p className="mt-2 text-sm text-slate-500">
              Manage live experiences, schedules, and upcoming session readiness.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px]">
            <input
              className="rounded-2xl border border-slate-300 px-4 py-3"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search experiences"
            />
            <select
              className="rounded-2xl border border-slate-300 bg-white px-4 py-3"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="draft">Draft</option>
            </select>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="text-sm text-slate-500">
            Showing {filteredExperiences.length} of {experiences.length} experience{experiences.length === 1 ? '' : 's'}.
          </p>
          <Link to="/create-experience" className="rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white">
            Create Experience
          </Link>
        </div>
      </div>

      {filteredExperiences.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {filteredExperiences.map((experience) => {
            const experienceForm = buildExperienceForm(experience, experienceEdits[experience.id]);
            const status = getExperienceStatus(experience);
            const upcomingSessions = experience.ScheduledExperiences || [];
            const nextSession = upcomingSessions[0] || null;
            const assignedPeople = experienceForm.organizerUserIds || [];
            const isExpanded = expandedExperienceId === experience.id;
            const isConfirmingDelete = deleteTargetId === experience.id;
            const isAutoSyncOn = experience.autoSyncEnabled !== false;
            const currentLookahead = experience.scheduleLookaheadDays || 90;

            return (
              <div key={experience.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
                <div className="flex flex-col gap-4 xl:flex-row">
                  <div className="h-40 w-full overflow-hidden rounded-3xl bg-slate-100 xl:w-40 xl:flex-none">
                    {experienceForm.pendingThumbnailPreviewUrl || experienceForm.thumbnail ? (
                      <img
                        src={experienceForm.pendingThumbnailPreviewUrl || experienceForm.thumbnail}
                        alt={`${experience.title || 'Experience'} thumbnail`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm text-slate-400">
                        No image
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="truncate text-xl font-semibold text-slate-900">{experience.title}</h4>
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${status.classes}`}>
                            {status.label}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-slate-500">{experience.subtitle || 'No subtitle yet.'}</p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {experience.code ? (
                          <Link
                            to={`/experience/${experience.code}`}
                            className="rounded-full border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700"
                          >
                            View Details
                          </Link>
                        ) : null}
                        {isAdmin ? (
                          <Link
                            to={`/edit-experience/${experience.id}`}
                            className="rounded-full bg-slate-900 px-3 py-1.5 text-sm font-medium text-white"
                          >
                            Edit
                          </Link>
                        ) : null}
                        {isAdmin ? (
                          <button
                            type="button"
                            className="rounded-full border border-slate-400 px-3 py-1.5 text-sm font-medium text-slate-700"
                            onClick={() => setExpandedExperienceId((current) => (current === experience.id ? null : experience.id))}
                          >
                            {isExpanded ? 'Close' : 'Schedule'}
                          </button>
                        ) : null}
                        {isAdmin ? (
                          <button
                            type="button"
                            className="rounded-full bg-rose-600 px-3 py-1.5 text-sm font-medium text-white"
                            onClick={() => setDeleteTargetId((current) => (current === experience.id ? null : experience.id))}
                          >
                            Delete
                          </button>
                        ) : null}
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      <div className="rounded-2xl bg-slate-50 p-3">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Upcoming Sessions</p>
                        <p className="mt-1 text-lg font-semibold text-slate-900">{upcomingSessions.length}</p>
                      </div>
                      <div className="rounded-2xl bg-slate-50 p-3">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Assigned Organizers</p>
                        <p className="mt-1 text-lg font-semibold text-slate-900">{assignedPeople.length}</p>
                      </div>
                      <div className="rounded-2xl bg-slate-50 p-3">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Next Session</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">
                          {nextSession ? new Date(nextSession.dateTime).toLocaleDateString() : 'Not scheduled'}
                        </p>
                      </div>
                    </div>

                    {isConfirmingDelete ? (
                      <div className="mt-4 rounded-3xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
                        <p className="font-semibold">Delete {experience.title}?</p>
                        <p className="mt-1 text-rose-700">
                          This removes the experience and any schedule data that does not have reservations.
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            className="rounded-full bg-rose-600 px-4 py-2 font-semibold text-white"
                            onClick={() => handleDeleteExperience(experience.id)}
                          >
                            Confirm Delete
                          </button>
                          <button
                            type="button"
                            className="rounded-full border border-rose-200 px-4 py-2 font-semibold text-rose-700"
                            onClick={() => setDeleteTargetId(null)}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : null}

                    {isExpanded ? (
                      <div className="mt-5 space-y-5 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                        <div>
                          <div className="flex flex-wrap items-center gap-3">
                            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${isAutoSyncOn ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                              Auto-sync: {isAutoSyncOn ? 'ON' : 'OFF'}
                            </span>
                            <span className="text-xs text-slate-500">Lookahead: {currentLookahead} days</span>
                            {isAdmin && updateLookahead ? (
                              <LookaheadEditor
                                experienceId={experience.id}
                                currentDays={currentLookahead}
                                updateLookahead={updateLookahead}
                              />
                            ) : null}
                          </div>

                          {isAdmin && toggleAutoSync ? (
                            <button
                              type="button"
                              className={`mt-3 rounded-full px-4 py-2 text-sm font-semibold ${isAutoSyncOn ? 'bg-amber-500 text-white' : 'bg-emerald-600 text-white'}`}
                              onClick={() => toggleAutoSync(experience.id, !isAutoSyncOn)}
                            >
                              {isAutoSyncOn ? 'Disable Auto-sync' : 'Enable Auto-sync'}
                            </button>
                          ) : null}
                        </div>

                        <div>
                          <h5 className="text-sm font-semibold text-slate-900">Upcoming Schedule</h5>
                          <ul className="mt-3 space-y-2 text-sm text-slate-600">
                            {upcomingSessions.slice(0, 6).map((scheduledExperience) => (
                              <li key={scheduledExperience.id} className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2">
                                <span className="flex-1">
                                  {new Date(scheduledExperience.dateTime).toLocaleString()} - {scheduledExperience.availableSpots} spots left
                                </span>
                                {scheduledExperience.syncLocked ? (
                                  <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-600">Locked</span>
                                ) : null}
                                {isAdmin && toggleSessionSyncLock ? (
                                  <button
                                    type="button"
                                    className="text-xs text-slate-500 hover:text-slate-700"
                                    onClick={() => toggleSessionSyncLock(scheduledExperience.id, !scheduledExperience.syncLocked)}
                                  >
                                    {scheduledExperience.syncLocked ? 'Unlock' : 'Lock'}
                                  </button>
                                ) : null}
                              </li>
                            ))}
                            {upcomingSessions.length === 0 ? (
                              <li className="rounded-2xl border border-dashed border-slate-300 bg-white px-3 py-4 text-center text-slate-500">
                                No upcoming sessions yet.
                              </li>
                            ) : null}
                          </ul>
                        </div>

                        {isAdmin ? (
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              className="rounded-full bg-slate-800 px-4 py-2 text-sm font-semibold text-white"
                              onClick={() => syncExperienceSchedule(experience.id)}
                            >
                              Sync Schedule
                            </button>
                            <button
                              type="button"
                              className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
                              onClick={() => {
                                setPopulateModalExperienceId(experience.id);
                                setPopulateModalTemplates(experience.ScheduleTemplates || []);
                              }}
                            >
                              Populate Schedule
                            </button>
                            <button
                              type="button"
                              className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
                              onClick={() => setStartDateModalExperienceId(experience.id)}
                            >
                              Update Start Date
                            </button>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>

                {populateModalExperienceId === experience.id ? (
                  <PopulateScheduleModal
                    experienceId={experience.id}
                    templates={populateModalTemplates}
                    onClose={() => setPopulateModalExperienceId(null)}
                    onPopulated={() => {
                      setPopulateModalExperienceId(null);
                      syncExperienceSchedule(experience.id);
                    }}
                  />
                ) : null}

                {startDateModalExperienceId === experience.id ? (
                  <UpdateStartDateModal
                    experienceId={experience.id}
                    onClose={() => setStartDateModalExperienceId(null)}
                    onConfirmed={() => syncExperienceSchedule(experience.id)}
                  />
                ) : null}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
          <h4 className="text-xl font-semibold text-slate-900">
            {experiences.length > 0 ? 'No experiences match your filters' : 'No experiences yet'}
          </h4>
          <p className="mt-2 text-sm text-slate-500">
            {experiences.length > 0
              ? 'Try adjusting the search text or status filter to find the experience you want.'
              : `Create your first experience to start scheduling sessions for ${organization.name}.`}
          </p>
          {experiences.length === 0 ? (
            <Link to="/create-experience" className="mt-5 inline-flex rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white">
              Create your first experience
            </Link>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default OrgExperiencesPanel;