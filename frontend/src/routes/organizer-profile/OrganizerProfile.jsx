import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faAddressCard,
  faBars,
  faBuilding,
  faCalendarDays,
  faChartLine,
  faComments,
  faImages,
  faLocationDot,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import { AuthContext } from 'contexts/AuthContext';
import { networkAdapter } from 'services/NetworkAdapter';
import useOutsideClickHandler from 'hooks/useOutsideClickHandler';
import Tabs from 'components/ux/tabs/Tabs';
import TabPanel from 'components/ux/tab-panel/TabPanel';
import Toast from 'components/ux/toast/Toast';
import KpiGrid from './components/KpiGrid';
import UpcomingSessionsPanel from './components/UpcomingSessionsPanel';
import CommentsSection from 'components/comments/CommentsSection';
import OrganizerDetailsCard from './components/OrganizerDetailsCard';
import LocationsPanel from './components/LocationsPanel';
import OrgMembersPanel from './components/OrgMembersPanel';
import OrgExperiencesPanel from './components/OrgExperiencesPanel';
import {
  buildUpcomingSessionEntries,
  buildPastSessionEntries,
  filterSessionsWithinDays,
} from './utils/dashboardUtils';

const OrganizerProfile = () => {
  const { userDetails, triggerAuthCheck } = useContext(AuthContext);
  const location = useLocation();
  const navigate = useNavigate();
  const wrapperRef = useRef();
  const buttonRef = useRef();
  const hasRetriedWorkspaceLoadRef = useRef(false);
  const queryTab = new URLSearchParams(location.search).get('tab');
  const [workspace, setWorkspace] = useState({ organizer: null, organizations: [] });
  const [locations, setLocations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTabsVisible, setIsTabsVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('error');

  const [profileForm, setProfileForm] = useState({
    description: '',
    profilePicture: userDetails?.profilePicture || '',
  });
  const [pendingProfilePictureFile, setPendingProfilePictureFile] = useState(null);
  const [pendingProfilePicturePreviewUrl, setPendingProfilePicturePreviewUrl] = useState('');

  const [orgEdits, setOrgEdits] = useState({});
  const [inviteEdits, setInviteEdits] = useState({});
  const [experienceEdits, setExperienceEdits] = useState({});
  const [pastWorkspaceOrganizations, setPastWorkspaceOrganizations] = useState([]);
  const [isLoadingPastSessions, setIsLoadingPastSessions] = useState(false);
  const [receivedComments, setReceivedComments] = useState([]);
  const [receivedCommentsTargetType, setReceivedCommentsTargetType] = useState('all');
  const [receivedCommentsPageSize, setReceivedCommentsPageSize] = useState(10);
  const [receivedCommentsSortType, setReceivedCommentsSortType] = useState('newest');
  const [receivedCommentsMetadata, setReceivedCommentsMetadata] = useState({
    currentPage: 1,
    totalPages: 0,
    totalItems: 0,
    hasNext: false,
  });
  const [isLoadingReceivedComments, setIsLoadingReceivedComments] = useState(false);
  const [receivedCommentsError, setReceivedCommentsError] = useState('');

  const applyWorkspaceState = useCallback(
    (workspaceData, nextLocations) => {
      const normalizedWorkspaceData = workspaceData || {
        organizer: null,
        organizations: [],
      };

      setWorkspace(normalizedWorkspaceData);
      setProfileForm((previous) => ({
        ...previous,
        description: normalizedWorkspaceData.organizer?.description || '',
        profilePicture: userDetails?.profilePicture || '',
      }));

      const seededOrgEdits = (normalizedWorkspaceData.organizations || []).reduce(
        (accumulator, organization) => {
          accumulator[organization.id] = {
            name: organization.name || '',
            email: organization.email || '',
            locationId: organization.LocationId || '',
          };
          return accumulator;
        },
        {}
      );
      setOrgEdits(seededOrgEdits);

      const seededInviteEdits = (normalizedWorkspaceData.organizations || []).reduce(
        (accumulator, organization) => {
          accumulator[organization.id] = {
            email: '',
            role: 'member',
            expiresInDays: 7,
          };
          return accumulator;
        },
        {}
      );
      setInviteEdits(seededInviteEdits);

      const seededExperienceEdits = (normalizedWorkspaceData.organizations || []).reduce(
        (accumulator, organization) => {
          (organization.Experiences || []).forEach((experience) => {
            accumulator[experience.id] = {
              title: experience.title || '',
              subtitle: experience.subtitle || '',
              description: experience.description || '',
              thumbnail: experience.thumbnail || '',
              capacity: experience.capacity || '',
              duration: experience.duration || '',
              organizerUserIds: (experience.Organizers || []).map((organizer) => organizer.id),
            };
          });
          return accumulator;
        },
        {}
      );
      setExperienceEdits(seededExperienceEdits);

      if (Array.isArray(nextLocations)) {
        setLocations(nextLocations);
      }
    },
    [userDetails?.profilePicture]
  );

  const showToast = useCallback((type, message) => {
    setToastType(type);
    setToastMessage(message);
  }, []);

  const dismissToast = () => setToastMessage('');

  useOutsideClickHandler(wrapperRef, (event) => {
    if (!buttonRef.current?.contains(event.target)) {
      setIsTabsVisible(false);
    }
  });

  const onTabsMenuButtonAction = () => {
    setIsTabsVisible((current) => !current);
  };

  const loadReceivedComments = useCallback(
    async ({ page = 1, append = false, targetType = receivedCommentsTargetType } = {}) => {
      if (!workspace?.organizer?.id) {
        setReceivedComments([]);
        setReceivedCommentsMetadata({
          currentPage: 1,
          totalPages: 0,
          totalItems: 0,
          hasNext: false,
        });
        setReceivedCommentsError('');
        setIsLoadingReceivedComments(false);
        return;
      }

      setIsLoadingReceivedComments(true);
      setReceivedCommentsError('');

      const response = await networkAdapter.get('/api/organizers/comments/received', {
        currentPage: page,
        pageSize: receivedCommentsPageSize,
        targetType,
        sortType: receivedCommentsSortType,
      });

      if (response?.errors?.length) {
        setReceivedCommentsError(response.errors[0] || 'Unable to load comments right now.');
        setIsLoadingReceivedComments(false);
        return;
      }

      const elements = Array.isArray(response?.data?.elements) ? response.data.elements : [];
      const metadata = response?.metadata || {};

      setReceivedComments((previous) => (append ? [...previous, ...elements] : elements));
      setReceivedCommentsMetadata({
        currentPage: Number(metadata.currentPage || page),
        totalPages: Number(metadata.totalPages || 0),
        totalItems: Number(metadata.totalItems || elements.length || 0),
        hasNext: Boolean(metadata.hasNext),
      });
      setIsLoadingReceivedComments(false);
    },
    [receivedCommentsPageSize, receivedCommentsSortType, receivedCommentsTargetType, workspace?.organizer?.id]
  );

  const uploadMedia = useCallback(
    async (file, kind) => {
      if (!userDetails?.id) {
        throw new Error('Missing user id');
      }

      const uploadResponse = await networkAdapter.upload('/api/media/upload', file, {
        method: 'PUT',
        params: {
          ownerType: 'user',
          ownerId: String(userDetails.id),
          kind,
        },
        headers: {
          'Content-Type': file.type || 'application/octet-stream',
        },
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload image');
      }

      const uploadData = uploadResponse;
      if (uploadData?.errors?.length || !uploadData?.data?.objectKey) {
        throw new Error(uploadData?.errors?.[0] || 'Failed to upload image');
      }

      return uploadData.data.objectKey;
    },
    [userDetails?.id]
  );

  const loadWorkspace = useCallback(async () => {
    setIsLoading(true);
    const [workspaceResponse, metaResponse] = await Promise.all([
      networkAdapter.get('/api/organizers/workspace'),
      networkAdapter.get('/api/organizers/onboarding/meta'),
    ]);

    const initialLocations = Array.isArray(metaResponse?.data?.locations)
      ? metaResponse.data.locations
      : null;

    if (workspaceResponse?.errors?.length) {
      if (!hasRetriedWorkspaceLoadRef.current) {
        hasRetriedWorkspaceLoadRef.current = true;
        const authenticated = await triggerAuthCheck();

        if (authenticated) {
          const [retryWorkspaceResponse, retryMetaResponse] = await Promise.all([
            networkAdapter.get('/api/organizers/workspace'),
            networkAdapter.get('/api/organizers/onboarding/meta'),
          ]);

          if (!retryWorkspaceResponse?.errors?.length) {
            const retryLocations = Array.isArray(retryMetaResponse?.data?.locations)
              ? retryMetaResponse.data.locations
              : initialLocations;
            applyWorkspaceState(retryWorkspaceResponse?.data, retryLocations);
            try {
              // Load received comments now that workspace is available
              await loadReceivedComments({ page: 1, append: false, targetType: receivedCommentsTargetType });
            } catch (e) {
              /* ignore */
            }

            hasRetriedWorkspaceLoadRef.current = false;
            setIsLoading(false);
            return;
          }

          if (![401, 403].includes(Number(retryWorkspaceResponse?.status))) {
            showToast(
              'error',
              retryWorkspaceResponse?.errors?.[0] ||
                'Unable to refresh organizer workspace right now.'
            );
            hasRetriedWorkspaceLoadRef.current = false;
            setIsLoading(false);
            return;
          }
        }
      }

      if (![401, 403].includes(Number(workspaceResponse?.status))) {
        showToast(
          'error',
          workspaceResponse?.errors?.[0] ||
            'Unable to load organizer workspace right now.'
        );
        hasRetriedWorkspaceLoadRef.current = false;
        setIsLoading(false);
        return;
      }

      await networkAdapter.post('api/users/logout');
      await triggerAuthCheck();
      hasRetriedWorkspaceLoadRef.current = false;
      setIsLoading(false);
      navigate('/login', {
        replace: true,
        state: {
          from: { pathname: '/organizer-profile' },
        },
      });
      return;
    }

    hasRetriedWorkspaceLoadRef.current = false;
    applyWorkspaceState(workspaceResponse?.data, initialLocations);
    try {
      // Load received comments now that workspace is available
      await loadReceivedComments({ page: 1, append: false, targetType: receivedCommentsTargetType });
    } catch (e) {
      /* ignore */
    }

    setIsLoading(false);
  }, [applyWorkspaceState, navigate, showToast, triggerAuthCheck]);

  useEffect(() => {
    loadWorkspace();
  }, [loadWorkspace]);

  const loadPastSessions = useCallback(async () => {
    setIsLoadingPastSessions(true);
    const response = await networkAdapter.get('/api/organizers/workspace', { includePast: 'true' });
    if (!response?.errors?.length && response?.data?.organizations) {
      setPastWorkspaceOrganizations(response.data.organizations);
    }
    setIsLoadingPastSessions(false);
  }, []);

  useEffect(() => {
    if (!workspace?.organizer?.id) {
      setReceivedComments([]);
      setReceivedCommentsMetadata({
        currentPage: 1,
        totalPages: 0,
        totalItems: 0,
        hasNext: false,
      });
      setReceivedCommentsError('');
      return;
    }

    loadReceivedComments({
      page: 1,
      append: false,
      targetType: receivedCommentsTargetType,
    });
  }, [loadReceivedComments, receivedCommentsPageSize, receivedCommentsSortType, receivedCommentsTargetType, workspace?.organizer?.id]);

  useEffect(() => {
    return () => {
      if (pendingProfilePicturePreviewUrl) {
        URL.revokeObjectURL(pendingProfilePicturePreviewUrl);
      }
    };
  }, [pendingProfilePicturePreviewUrl]);

  const adminOrganizations = useMemo(
    () => (userDetails?.organizations || []).filter((organization) => organization.isAdmin),
    [userDetails]
  );

  const isOrganizationAdmin = (organizationId) =>
    adminOrganizations.some((organization) => organization.id === organizationId);

  const saveProfile = async () => {
    let profilePicturePayload = profileForm.profilePicture;

    if (pendingProfilePictureFile) {
      try {
        profilePicturePayload = await uploadMedia(pendingProfilePictureFile, 'profile');
      } catch (_error) {
        showToast('error', 'Profile image upload failed.');
        return;
      }
    }

    const response = await networkAdapter.patch('/api/organizers/profile', {
      description: profileForm.description,
      profilePicture: profilePicturePayload,
    });

    if (response?.errors?.length) {
      showToast('error', response.errors[0]);
      return;
    }

    showToast('success', 'Organizer profile updated.');
    setPendingProfilePictureFile(null);
    if (pendingProfilePicturePreviewUrl) {
      URL.revokeObjectURL(pendingProfilePicturePreviewUrl);
      setPendingProfilePicturePreviewUrl('');
    }
    triggerAuthCheck();
    await loadWorkspace();
  };

  const saveOrganization = async (organizationId) => {
    const orgForm = orgEdits[organizationId];
    const response = await networkAdapter.patch(
      `/api/organizers/organizations/${organizationId}`,
      {
        name: orgForm.name,
        email: orgForm.email,
        locationId: orgForm.locationId || null,
      }
    );

    if (response?.errors?.length) {
      showToast('error', response.errors[0]);
      return;
    }

    showToast('success', 'Organization updated.');
    await loadWorkspace();
  };

  const createOrganizationInvite = async (organizationId) => {
    const inviteForm = inviteEdits[organizationId] || {
      email: '',
      role: 'member',
      expiresInDays: 7,
    };

    if (!inviteForm.email || !inviteForm.email.includes('@')) {
      showToast('error', 'Please provide a valid invite email.');
      return;
    }

    const expiresInDays = Number(inviteForm.expiresInDays);
    if (!Number.isFinite(expiresInDays) || expiresInDays < 1 || expiresInDays > 30) {
      showToast('error', 'Invite expiry must be between 1 and 30 days.');
      return;
    }

    const response = await networkAdapter.post('/api/organizers/invites', {
      organizationId,
      email: inviteForm.email,
      role: inviteForm.role,
      expiresInDays,
    });

    if (response?.errors?.length) {
      showToast('error', response.errors[0]);
      return;
    }

    setInviteEdits((previous) => ({
      ...previous,
      [organizationId]: {
        ...inviteForm,
        email: '',
      },
    }));

    showToast(
      'success',
      response?.data?.delivery?.sent
        ? 'Invite created and notification dispatched.'
        : 'Invite created. Share the invite link/code manually.'
    );
    await loadWorkspace();
  };

  const copyText = async (value, successMessage) => {
    if (!value) {
      showToast('error', 'Nothing to copy yet.');
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      showToast('success', successMessage);
    } catch (_error) {
      showToast('error', 'Unable to copy to clipboard. Please copy manually.');
    }
  };

  const resendOrganizationInvite = async (inviteId) => {
    const response = await networkAdapter.post(`/api/organizers/invites/${inviteId}/resend`);

    if (response?.errors?.length) {
      showToast('error', response.errors[0]);
      return;
    }

    showToast(
      'success',
      response?.data?.delivery?.sent
        ? 'Invite email resent successfully.'
        : 'Resend attempted. Share the invite link/code manually.'
    );
  };

  const cancelOrganizationInvite = async (inviteId) => {
    const response = await networkAdapter.delete(`/api/organizers/invites/${inviteId}`);

    if (response?.errors?.length) {
      showToast('error', response.errors[0]);
      return false;
    }

    showToast('success', 'Invite cancelled.');
    await loadWorkspace();
    return true;
  };

  const saveExperience = async (experienceId) => {
    const experienceForm = experienceEdits[experienceId];

    let thumbnailPayload = experienceForm.thumbnail || null;
    if (experienceForm.pendingThumbnailFile) {
      try {
        thumbnailPayload = await uploadMedia(experienceForm.pendingThumbnailFile, 'event-thumbnail');
      } catch (_error) {
        showToast('error', 'Experience thumbnail upload failed.');
        return;
      }
    }

    const response = await networkAdapter.patch(`/api/experiences/manage/${experienceId}`, {
      title: experienceForm.title,
      subtitle: experienceForm.subtitle,
      description: experienceForm.description,
      thumbnail: thumbnailPayload,
      capacity: Number(experienceForm.capacity),
      duration: Number(experienceForm.duration),
    });

    if (response?.errors?.length) {
      showToast('error', response.errors[0]);
      return;
    }

    showToast('success', 'Experience updated.');
    await loadWorkspace();
  };

  const deleteExperience = async (experienceId) => {
    const response = await networkAdapter.delete(`/api/experiences/manage/${experienceId}`);

    if (response?.errors?.length) {
      showToast('error', response.errors[0]);
      return false;
    }

    showToast('success', 'Experience deleted.');
    await loadWorkspace();
    return true;
  };

  const syncExperienceSchedule = async (experienceId) => {
    const response = await networkAdapter.post(`/api/experiences/manage/${experienceId}/sync-schedule`);

    if (response?.errors?.length) {
      showToast('error', response.errors[0]);
      return;
    }

    showToast('success', `Schedule synced (${response?.data?.syncedCount || 0} new sessions).`);
    await loadWorkspace();
  };

  const toggleAutoSync = async (experienceId, enabled) => {
    if (enabled) {
      // Check if any locked sessions exist for this experience
      const allExperiences = organizations.flatMap((org) => org.Experiences || org.Events || []);
      const experience = allExperiences.find((exp) => exp.id === experienceId);
      const hasLockedSessions = (experience?.ScheduledExperiences || []).some((s) => s.syncLocked);
      if (hasLockedSessions) {
        showToast('warning', 'Some sessions are locked and will not be affected by auto-sync.');
      }
    }

    const response = await networkAdapter.patch(`/api/experiences/manage/${experienceId}/auto-sync`, { enabled });

    if (response?.errors?.length) {
      showToast('error', response.errors[0]);
      return;
    }

    showToast('success', `Auto-sync ${enabled ? 'enabled' : 'disabled'}.`);
    await loadWorkspace();
  };

  const toggleSessionSyncLock = async (sessionId, locked) => {
    const response = await networkAdapter.patch(`/api/experiences/manage/scheduled-experiences/${sessionId}/sync-lock`, { locked });

    if (response?.errors?.length) {
      showToast('error', response.errors[0]);
      return;
    }

    showToast('success', `Session ${locked ? 'locked' : 'unlocked'}.`);
    await loadWorkspace();
  };

  const updateLookahead = async (experienceId, days) => {
    const response = await networkAdapter.patch(`/api/experiences/manage/${experienceId}/lookahead`, { days });

    if (response?.errors?.length) {
      showToast('error', response.errors[0]);
      return;
    }

    showToast('success', `Lookahead updated to ${days} days.`);
    await loadWorkspace();
  };

  const saveExperienceAssignments = async (experienceId) => {
    const experienceForm = experienceEdits[experienceId];
    const response = await networkAdapter.patch(`/api/experiences/manage/${experienceId}/assign-organizers`, {
      organizerUserIds: experienceForm.organizerUserIds || [],
    });

    if (response?.errors?.length) {
      showToast('error', response.errors[0]);
      return;
    }

    showToast('success', 'Assigned people updated for experience.');
    await loadWorkspace();
  };

  const formatCommentDate = (value) => {
    if (!value) return 'Unknown time';
    const parsedDate = new Date(value);
    if (Number.isNaN(parsedDate.getTime())) {
      return 'Unknown time';
    }

    return parsedDate.toLocaleString();
  };

  const renderStars = (stars) => {
    const roundedStars = Math.max(0, Math.min(5, Math.round(Number(stars) || 0)));
    return `${'★'.repeat(roundedStars)}${'☆'.repeat(5 - roundedStars)}`;
  };

  const organizations = useMemo(() => workspace.organizations || [], [workspace.organizations]);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState('');

  useEffect(() => {
    if (!organizations.length) {
      setSelectedOrganizationId('');
      return;
    }

    const selectedStillExists = organizations.some(
      (organization) => String(organization.id) === String(selectedOrganizationId)
    );

    if (!selectedOrganizationId || !selectedStillExists) {
      setSelectedOrganizationId(String(organizations[0].id));
    }
  }, [organizations, selectedOrganizationId]);

  const selectedOrganization = useMemo(
    () =>
      organizations.find(
        (organization) => String(organization.id) === String(selectedOrganizationId)
      ) || organizations[0] || null,
    [organizations, selectedOrganizationId]
  );

  const selectedOrganizationIsAdmin = useMemo(
    () => (selectedOrganization ? isOrganizationAdmin(selectedOrganization.id) : false),
    [isOrganizationAdmin, selectedOrganization]
  );

  const upcomingSessionEntries = useMemo(
    () => buildUpcomingSessionEntries(organizations),
    [organizations]
  );

  const pastSessionEntries = useMemo(
    () => buildPastSessionEntries(pastWorkspaceOrganizations),
    [pastWorkspaceOrganizations]
  );

  const upcomingSessionsNext7Days = useMemo(
    () => filterSessionsWithinDays(upcomingSessionEntries, 7),
    [upcomingSessionEntries]
  );

  const pendingInvitesCount = useMemo(() => {
    return organizations.reduce(
      (accumulator, organization) => accumulator + ((organization.pendingInvites || []).length),
      0
    );
  }, [organizations]);

  const newCommentsCount = useMemo(() => {
    const threshold = Date.now() - 7 * 24 * 60 * 60 * 1000;

    return receivedComments.filter((comment) => {
      const parsedDate = new Date(comment.createdAt).getTime();
      return !Number.isNaN(parsedDate) && parsedDate >= threshold;
    }).length;
  }, [receivedComments]);

  const totalOpenSpotsNext7Days = useMemo(
    () => upcomingSessionsNext7Days.reduce((accumulator, session) => accumulator + Math.max(0, Number(session.availableSpots || 0)), 0),
    [upcomingSessionsNext7Days]
  );

  const unscheduledExperiencesCount = useMemo(
    () =>
      organizations.reduce(
        (accumulator, organization) =>
          accumulator +
          (organization.Experiences || organization.Events || []).filter(
            (experience) => !(experience.ScheduledExperiences || []).length
          ).length,
        0
      ),
    [organizations]
  );

  const lowCapacitySessionsCount = useMemo(
    () => upcomingSessionsNext7Days.filter((session) => Number(session.availableSpots || 0) <= 5).length,
    [upcomingSessionsNext7Days]
  );

  const dashboardActions = useMemo(
    () => [
      {
        id: 'unscheduled',
        label: `${unscheduledExperiencesCount} experience${unscheduledExperiencesCount === 1 ? '' : 's'} without upcoming sessions`,
        shouldShow: unscheduledExperiencesCount > 0,
      },
      {
        id: 'low-capacity',
        label: `${lowCapacitySessionsCount} session${lowCapacitySessionsCount === 1 ? '' : 's'} with 5 or fewer spots left`,
        shouldShow: lowCapacitySessionsCount > 0,
      },
      {
        id: 'pending-invites',
        label: `${pendingInvitesCount} pending invite${pendingInvitesCount === 1 ? '' : 's'} requiring follow-up`,
        shouldShow: pendingInvitesCount > 0,
      },
    ].filter((item) => item.shouldShow),
    [lowCapacitySessionsCount, pendingInvitesCount, unscheduledExperiencesCount]
  );

  const selectedOrganizationForm = selectedOrganization
    ? orgEdits[selectedOrganization.id] || {
        name: selectedOrganization.name || '',
        email: selectedOrganization.email || '',
        locationId: selectedOrganization.LocationId || '',
      }
    : { name: '', email: '', locationId: '' };

  const selectedInviteForm = selectedOrganization
    ? inviteEdits[selectedOrganization.id] || {
        email: '',
        role: 'member',
        expiresInDays: 7,
      }
    : { email: '', role: 'member', expiresInDays: 7 };

  const updateSelectedOrganizationField = (field, value) => {
    if (!selectedOrganization) {
      return;
    }

    setOrgEdits((previous) => ({
      ...previous,
      [selectedOrganization.id]: {
        ...selectedOrganizationForm,
        [field]: value,
      },
    }));
  };

  const updateSelectedInviteField = (field, value) => {
    if (!selectedOrganization) {
      return;
    }

    setInviteEdits((previous) => ({
      ...previous,
      [selectedOrganization.id]: {
        ...selectedInviteForm,
        [field]: value,
      },
    }));
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 min-h-[420px]">
        <div className="animate-pulse bg-slate-200 h-28 rounded" />
      </div>
    );
  }

  if (!workspace.organizer) {
    return (
      <div className="container mx-auto p-6 min-h-[420px]">
        <h2 className="text-2xl font-bold text-brand mb-3">Organizer Profile</h2>
        <p className="text-slate-600 mb-4">You are not an organizer yet.</p>
        <Link to="/organizer-signup" className="px-4 py-2 rounded bg-brand text-white inline-block">
          Become Organizer
        </Link>
      </div>
    );
  }


  return (
    <div className="container mx-auto p-4 md:p-6 min-h-[700px]">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex items-start gap-3">
          <button
            ref={buttonRef}
            onClick={onTabsMenuButtonAction}
            className="mt-1 block rounded-xl border border-slate-300 bg-white px-4 py-2 text-slate-700 shadow-sm md:hidden"
            aria-label="Toggle organizer profile tabs"
          >
            <FontAwesomeIcon icon={isTabsVisible ? faXmark : faBars} size="lg" />
          </button>
          <div>
            <h2 className="text-3xl font-extrabold text-brand">Organizer Home</h2>
            <p className="mt-2 text-slate-600">
              Track what needs attention, upcoming sessions, and manage your organization workspace.
            </p>
          </div>
        </div>

        <Link to="/create-experience" className="inline-flex rounded-full bg-brand px-5 py-2.5 text-center text-sm font-semibold text-white">
          Create Experience
        </Link>
      </div>

      <Tabs initialActiveTab={queryTab === 'Organizations' ? 'Organization' : queryTab || 'Dashboard'} isTabsVisible={isTabsVisible} wrapperRef={wrapperRef}>
        <TabPanel label="Dashboard" icon={faChartLine}>
          <KpiGrid
            upcomingSessionsCount={upcomingSessionsNext7Days.length}
            openSpotsCount={totalOpenSpotsNext7Days}
            pendingInvitesCount={pendingInvitesCount}
            newCommentsCount={newCommentsCount}
          />

          {dashboardActions.length > 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">Needs Attention</h3>
              <div className="mt-4 space-y-3">
                {dashboardActions.map((action) => (
                  <div key={action.id} className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                    {action.label}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </TabPanel>

        <TabPanel label="Scheduled Sessions" icon={faCalendarDays}>
          <UpcomingSessionsPanel
            upcomingSessionEntries={upcomingSessionEntries}
            pastSessionEntries={pastSessionEntries}
            isLoadingPast={isLoadingPastSessions}
            onRequestPastSessions={loadPastSessions}
          />
        </TabPanel>

        <TabPanel label="Comments" icon={faComments}>
          <CommentsSection
            userDetails={userDetails}
            displayText='View feedback about your organizer profile and experiences you have served on.'
            comments={receivedComments}
            commentsTargetType={receivedCommentsTargetType}
            setCommentsTargetType={setReceivedCommentsTargetType}
            commentsSortType={receivedCommentsSortType}
            setCommentsSortType={setReceivedCommentsSortType}
            commentsPageSize={receivedCommentsPageSize}
            setCommentsPageSize={setReceivedCommentsPageSize}
            isLoadingComments={isLoadingReceivedComments}
            loadComments={loadReceivedComments}
            commentsMetadata={receivedCommentsMetadata}
            commentsError={receivedCommentsError}
            renderStars={renderStars}
            formatCommentDate={formatCommentDate}
            onLoginRedirect={() =>
              navigate('/login', {
                replace: true,
                state: {
                  from: { pathname: '/organizer-profile' },
                },
              })
            }
          />
        </TabPanel>

        <TabPanel label="Organization" icon={faBuilding}>
          <OrgMembersPanel
            organizations={organizations}
            organization={selectedOrganization}
            selectedOrganizationId={selectedOrganizationId}
            onSelectOrganization={setSelectedOrganizationId}
            isAdmin={selectedOrganizationIsAdmin}
            locations={locations}
            orgEdit={selectedOrganizationForm}
            onOrgFieldChange={updateSelectedOrganizationField}
            onSaveOrganization={() => selectedOrganization && saveOrganization(selectedOrganization.id)}
            inviteForm={selectedInviteForm}
            onInviteFieldChange={updateSelectedInviteField}
            onCreateInvite={() => selectedOrganization && createOrganizationInvite(selectedOrganization.id)}
            onResendInvite={resendOrganizationInvite}
            onCancelInvite={cancelOrganizationInvite}
            onCopyInviteValue={copyText}
          />
        </TabPanel>

        <TabPanel label="Experiences" icon={faImages}>
          <OrgExperiencesPanel
            organizations={organizations}
            organization={selectedOrganization}
            selectedOrganizationId={selectedOrganizationId}
            onSelectOrganization={setSelectedOrganizationId}
            isAdmin={selectedOrganizationIsAdmin}
            experienceEdits={experienceEdits}
            setExperienceEdits={setExperienceEdits}
            saveExperienceAssignments={saveExperienceAssignments}
            saveExperience={saveExperience}
            syncExperienceSchedule={syncExperienceSchedule}
            toggleAutoSync={toggleAutoSync}
            toggleSessionSyncLock={toggleSessionSyncLock}
            updateLookahead={updateLookahead}
            deleteExperience={deleteExperience}
          />
        </TabPanel>

        <TabPanel label="Locations" icon={faLocationDot}>
          <LocationsPanel
            locations={locations}
            organizations={organizations}
            onLocationsChanged={loadWorkspace}
            showToast={showToast}
          />
        </TabPanel>

        <TabPanel label="Profile Details" icon={faAddressCard}>
          <OrganizerDetailsCard
            pendingProfilePicturePreviewUrl={pendingProfilePicturePreviewUrl}
            profilePicture={profileForm.profilePicture}
            pendingProfilePictureFile={pendingProfilePictureFile}
            onSelectProfilePicture={(selectedFile) => {
              if (!selectedFile) return;
              if (pendingProfilePicturePreviewUrl) {
                URL.revokeObjectURL(pendingProfilePicturePreviewUrl);
              }
              setPendingProfilePictureFile(selectedFile);
              setPendingProfilePicturePreviewUrl(URL.createObjectURL(selectedFile));
            }}
            description={profileForm.description}
            onDescriptionChange={(nextValue) =>
              setProfileForm((previous) => ({
                ...previous,
                description: nextValue,
              }))
            }
            onSave={saveProfile}
          />
        </TabPanel>
      </Tabs>

      {toastMessage ? <Toast type={toastType} message={toastMessage} dismissError={dismissToast} /> : null}
    </div>
  );
};

export default OrganizerProfile;
