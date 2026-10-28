import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { EXPERIENCE_DETAILS_TEMPLATES, resolveDetailsMetadata } from '../experience-details/experienceDetailsTemplate';
import { Navigate, useNavigate } from 'react-router-dom';
import {
  CircleMarker,
  MapContainer,
  TileLayer,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { AuthContext } from 'contexts/AuthContext';
import { networkAdapter } from 'services/NetworkAdapter';
import ExperienceViewCard from 'components/experience-view-card/ExperienceViewCard';
import SessionsPreviewPanel from 'components/sessions-preview-panel/SessionsPreviewPanel';
import ExperienceDetails from 'routes/experience-details/ExperienceDetails';
import { getStandardCountryList } from 'utils/countries';
import {
  WEEKDAY_OPTIONS,
  buildCronExpression,
  getUpcomingSchedulePreview,
} from 'utils/schedule-builder';
import ScheduleBuilder from 'components/schedule-builder/ScheduleBuilder';

const defaultTicketTierQuestion = { prompt: '', required: false };
const defaultTicketTier = {
  title: '',
  price: '',
  description: '',
  minAge: '0',
  maxAge: '',
  userQuestionnary: [],
};
const defaultUserQuestion = { prompt: '', required: false };
const defaultTicketTierErrorState = {
  title: false,
  price: false,
  minAge: false,
  maxAge: false,
};

const CREATE_EXPERIENCE_STEPS = ['core', 'schedule', 'tiers', 'questions'];
const CREATE_EXPERIENCE_STEP_LABELS = {
  core: 'Core Details',
  schedule: 'Schedule',
  tiers: 'Ticket Tiers',
  questions: 'User Questionnaire',
};

const PREVIEW_REVIEWS = [
  {
    id: 'preview-comment-1',
    stars: 5,
    title: 'Excellent experience',
    comment: 'Everything was smooth and well organized. I would absolutely book again.',
    anonymity: 1,
    user: {
      firstName: 'Ava',
      city: 'New York',
      country: 'United States',
      profilePicture: '',
    },
  },
  {
    id: 'preview-comment-2',
    stars: 4,
    title: 'Great value',
    comment: 'Really enjoyable activity with clear communication and a great host.',
    anonymity: 1,
    user: {
      firstName: 'Liam',
      city: 'Toronto',
      country: 'Canada',
      profilePicture: '',
    },
  },
  {
    id: 'preview-comment-3',
    stars: 5,
    title: 'Highly recommended',
    comment: 'A highlight of our trip. The schedule and flow were exactly as expected.',
    anonymity: 1,
    user: {
      firstName: 'Noah',
      city: 'Chicago',
      country: 'United States',
      profilePicture: '',
    },
  },
];

const parsePositiveInteger = (value) => {
  const parsed = Number.parseInt(String(value || '').trim(), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const isRenderableImageUrl = (value) => {
  const normalizedValue = String(value || '').trim();
  return /^(https?:\/\/|blob:|data:image\/|\/)/i.test(normalizedValue);
};

const isValidTimeZone = (value) => {
  const normalizedValue = String(value || '').trim();
  if (!normalizedValue) {
    return false;
  }

  try {
    Intl.DateTimeFormat([], { timeZone: normalizedValue });
    return true;
  } catch (_error) {
    return false;
  }
};

const MapClickHandler = ({ onPick }) => {
  useMapEvents({
    click(event) {
      onPick(event.latlng);
    },
  });

  return null;
};

const MapCenterUpdater = ({ center }) => {
  const map = useMap();

  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);

  return null;
};

const LocationPickerMap = ({ point, onPick }) => {
  const hasValidPoint =
    Number.isFinite(Number(point?.lat)) && Number.isFinite(Number(point?.lon));
  const latitude = hasValidPoint ? Number(point.lat) : 0;
  const longitude = hasValidPoint ? Number(point.lon) : 0;
  const center = [latitude, longitude];
  const zoom = hasValidPoint ? 13 : 2;

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      scrollWheelZoom
      className="w-full h-96"
    >
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapCenterUpdater center={center} />
      <MapClickHandler onPick={onPick} />
      {hasValidPoint && (
        <CircleMarker
          center={center}
          radius={8}
          pathOptions={{ color: '#2563eb', fillColor: '#2563eb', fillOpacity: 0.75 }}
        />
      )}
    </MapContainer>
  );
};

const LocationMiniMap = ({ point }) => {
  const hasValidPoint =
    Number.isFinite(Number(point?.lat)) && Number.isFinite(Number(point?.lon));

  if (!hasValidPoint) {
    return (
      <div className="w-28 h-28 rounded border border-slate-200 bg-slate-100 flex items-center justify-center text-[11px] text-slate-500">
        No map
      </div>
    );
  }

  const center = [Number(point.lat), Number(point.lon)];

  return (
    <div className="w-28 h-28 rounded overflow-hidden border border-slate-200">
      <MapContainer center={center} zoom={13} scrollWheelZoom={false} dragging={false} doubleClickZoom={false} touchZoom={false} zoomControl={false} attributionControl={false} className="w-full h-full">
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <CircleMarker
          center={center}
          radius={6}
          pathOptions={{ color: '#2563eb', fillColor: '#2563eb', fillOpacity: 0.75 }}
        />
      </MapContainer>
    </div>
  );
};

/**
 * Builds the initial schedules array from ScheduleTemplates and PickedOccurrences
 * returned by the manage GET endpoint. Used to seed the ScheduleBuilder in edit mode.
 */
const buildSchedulesFromExperienceData = (experienceData) => {
  const templates = (experienceData?.ScheduleTemplates || []).map((tpl) => ({
    kind: 'template',
    name: tpl.name || null,
    ruleType: tpl.ruleType || 'cron',
    ruleCron: tpl.ruleCron || null,
    ruleDateTime: tpl.ruleDateTime || null,
    timezone: tpl.timezone || 'UTC',
    durationMinutes: tpl.durationMinutes != null ? String(tpl.durationMinutes) : '',
    capacity: tpl.capacity != null ? String(tpl.capacity) : '',
  }));

  const picks = (experienceData?.PickedOccurrences || []).map((pick) => ({
    kind: 'picked',
    dateTime: pick.dateTime || null,
    endDateTime: pick.endDateTime || null,
    capacity: pick.capacity != null ? String(pick.capacity) : '',
    note: pick.note || null,
  }));

  return [...templates, ...picks];
};

/**
 * Builds initial ticket tiers from experience data returned by the manage GET endpoint.
 */
const buildTiersFromExperienceData = (experienceData) => {
  if (!Array.isArray(experienceData?.TicketTiers) || experienceData.TicketTiers.length === 0) {
    return [{ ...defaultTicketTier }];
  }

  return experienceData.TicketTiers.map((tier) => ({
    title: tier.title || '',
    price: tier.price != null ? String(tier.price) : '',
    description: tier.description || '',
    minAge: tier.minAge != null ? String(tier.minAge) : '0',
    maxAge: tier.maxAge != null ? String(tier.maxAge) : '',
    userQuestionnary: Array.isArray(tier.userQuestionnary)
      ? tier.userQuestionnary.map((q) => ({ prompt: q.prompt || '', required: Boolean(q.required) }))
      : [],
  }));
};

/**
 * Builds a serializable snapshot of schedule state for deep-equality comparison.
 * Used to detect schedule changes in edit mode.
 */
const serializeSchedules = (schedules) => JSON.stringify(
  (schedules || []).map((s) => {
    if (!s) return null;
    if (s.kind === 'template') {
      return { kind: 'template', ruleCron: s.ruleCron || null, ruleDateTime: s.ruleDateTime || null, ruleType: s.ruleType || 'cron', timezone: s.timezone || 'UTC' };
    }
    if (s.kind === 'picked') {
      return { kind: 'picked', dateTime: s.dateTime || null, endDateTime: s.endDateTime || null };
    }
    return null;
  }).filter(Boolean)
);

const CreateExperience = ({ mode = 'create', experienceData = null }) => {
  const { userDetails } = useContext(AuthContext);
  const navigate = useNavigate();
  const [locations, setLocations] = useState([]);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('error');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [thumbnailPreviewUrl, setThumbnailPreviewUrl] = useState('');
  const [galleryFiles, setGalleryFiles] = useState([]);
  const [galleryPreviewUrls, setGalleryPreviewUrls] = useState([]);
  const [newLocationForm, setNewLocationForm] = useState({
    name: '',
    country: '',
    state: '',
    city: '',
    street: '',
    zipCode: '',
    notes: '',
    timezone: '',
  });
  const [isResolvingMapPoint, setIsResolvingMapPoint] = useState(false);
  const [isGeocodingLocationForm, setIsGeocodingLocationForm] = useState(false);
  const [locationMapPoint, setLocationMapPoint] = useState(null);
  const [savedLocalLocation, setSavedLocalLocation] = useState(null);
  const [isEditingSavedLocation, setIsEditingSavedLocation] = useState(true);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [activeStep, setActiveStep] = useState('core');
  const [validationSummary, setValidationSummary] = useState([]);
  const [, setLocationGeocodeDebug] = useState({
    status: 'idle',
    fullQuery: '',
    attemptedQueries: [],
    matchedQuery: '',
    matchedDisplayName: '',
    matchedCoordinates: '',
    error: '',
  });
  const geocodeCacheRef = useRef(new Map());
  const geocodeAbortControllerRef = useRef(null);
  const geocodeRequestIdRef = useRef(0);

  const isEditMode = mode === 'edit';

  const availableOrganizations = useMemo(
    () => userDetails?.organizations || [],
    [userDetails]
  );
  const countryOptions = useMemo(() => getStandardCountryList(), []);
  const isDevelopment = import.meta.env.DEV;
  const singleOrganization = availableOrganizations.length === 1 ? availableOrganizations[0] : null;

  const initialSchedules = useMemo(
    () => (isEditMode && experienceData ? buildSchedulesFromExperienceData(experienceData) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const originalScheduleSnapshotRef = useRef(isEditMode ? serializeSchedules(initialSchedules) : null);
  const [scheduleChangedFromOriginal, setScheduleChangedFromOriginal] = useState(false);
  const [scheduleBannerDismissed, setScheduleBannerDismissed] = useState(false);

  const [formData, setFormData] = useState(() => {
    if (isEditMode && experienceData) {
      return {
        organizationId: String(experienceData.OrganizationId || ''),
        locationId: String(experienceData.LocationId || ''),
        title: experienceData.title || '',
        detailsMetadata: resolveDetailsMetadata(experienceData.detailsMetadata),
        subtitle: experienceData.subtitle || '',
        description: experienceData.description || '',
        thumbnail: experienceData.thumbnail || '',
        capacity: experienceData.capacity != null ? String(experienceData.capacity) : '',
        duration: experienceData.duration != null ? String(experienceData.duration) : '60',
        recurrenceType: '',
        scheduleTime: '',
        scheduleDays: [],
        schedules: initialSchedules,
        ticketTiers: buildTiersFromExperienceData(experienceData),
        userQuestionnary: Array.isArray(experienceData.userQuestionnary)
          ? experienceData.userQuestionnary.map((q) => ({ prompt: q.prompt || '', required: Boolean(q.required) }))
          : [],
      };
    }

    return {
      organizationId: '',
      locationId: '',
      title: '',
      detailsMetadata: resolveDetailsMetadata(null),
      subtitle: '',
      description: '',
      thumbnail: '',
      capacity: '',
      duration: '60',
      recurrenceType: '',
      scheduleTime: '',
      scheduleDays: [],
      schedules: [],
      ticketTiers: [{ ...defaultTicketTier }],
      userQuestionnary: [],
    };
  });
  const [ticketTierErrors, setTicketTierErrors] = useState(() => {
    const count = isEditMode && experienceData?.TicketTiers?.length > 0
      ? experienceData.TicketTiers.length
      : 1;
    return Array.from({ length: count }, () => ({ ...defaultTicketTierErrorState }));
  });

  const selectedLocation = useMemo(
    () => locations.find((location) => String(location.id) === String(formData.locationId)) || null,
    [formData.locationId, locations]
  );
  const schedulePreviewTimezone = useMemo(() => {
    const latitude = Number(locationMapPoint?.lat);
    const longitude = Number(locationMapPoint?.lon);
    const hasValidGeoPoint =
      Number.isFinite(latitude) &&
      Number.isFinite(longitude) &&
      latitude >= -90 &&
      latitude <= 90 &&
      longitude >= -180 &&
      longitude <= 180;

    const geopointTimezone = String(newLocationForm.timezone || '').trim();
    const savedLocationTimezone = String(savedLocalLocation?.timezone || '').trim();
    const selectedLocationTimezone = String(selectedLocation?.timezone || '').trim();

    if (hasValidGeoPoint && isValidTimeZone(geopointTimezone)) {
      return geopointTimezone;
    }
    if (isValidTimeZone(savedLocationTimezone)) {
      return savedLocationTimezone;
    }
    if (isValidTimeZone(selectedLocationTimezone)) {
      return selectedLocationTimezone;
    }

    return 'UTC';
  }, [locationMapPoint?.lat, locationMapPoint?.lon, newLocationForm.timezone, savedLocalLocation?.timezone, selectedLocation?.timezone]);
  const previewLocation = savedLocalLocation
    ? {
        name: savedLocalLocation.name,
        street: savedLocalLocation.street,
        city: savedLocalLocation.city,
        state: savedLocalLocation.state,
        zipCode: savedLocalLocation.zipCode,
        country: savedLocalLocation.country,
        timezone: savedLocalLocation.timezone || 'UTC',
        coordinates: {
          coordinates: [Number(savedLocalLocation.longitude), Number(savedLocalLocation.latitude)],
        },
      }
    : selectedLocation;

    const computedCron = useMemo(() => {
      const recurrenceType = String(formData.recurrenceType || '').trim();
      const time = String(formData.scheduleTime || '').trim();
      const weekDays = Array.isArray(formData.scheduleDays) ? formData.scheduleDays : [];

      if (!recurrenceType) return null;
      if (recurrenceType === 'weekly' && weekDays.length === 0) return null;
      if (recurrenceType !== 'date' && !time) return null;

      try {
        return buildCronExpression({ recurrenceType, time, weekDays });
      } catch (_err) {
        return null;
      }
    }, [formData.recurrenceType, formData.scheduleDays, formData.scheduleTime]);

  


  
  

  const hasValidNewLocationCoordinates =
    Number.isFinite(Number(locationMapPoint?.lat)) &&
    Number.isFinite(Number(locationMapPoint?.lon)) &&
    Number(locationMapPoint?.lat) >= -90 &&
    Number(locationMapPoint?.lat) <= 90 &&
    Number(locationMapPoint?.lon) >= -180 &&
    Number(locationMapPoint?.lon) <= 180;
  const hasStreetAddressNumber = /\d/.test(String(newLocationForm.street || '').trim());

  const newLocationDuplicateNameError = useMemo(() => {
    const trimmedName = String(newLocationForm.name || '').trim().toLowerCase();
    if (!trimmedName) return '';
    const duplicate = locations.find(
      (location) => String(location.name || '').trim().toLowerCase() === trimmedName
    );
    return duplicate ? `A location named "${duplicate.name}" already exists. Select it from the dropdown instead.` : '';
  }, [newLocationForm.name, locations]);

  useEffect(() => {
    // Only clean up blob URLs on unmount
    return () => {
      if (thumbnailPreviewUrl) {
        URL.revokeObjectURL(thumbnailPreviewUrl);
      }
      galleryPreviewUrls.forEach((previewUrl) => URL.revokeObjectURL(previewUrl));
    };
  }, []);

  useEffect(() => {
    return () => {
      if (geocodeAbortControllerRef.current) {
        geocodeAbortControllerRef.current.abort();
      }
    };
  }, []);

  useEffect(() => {
    // In edit mode the organizationId is pre-seeded from experienceData; don't override it.
    if (isEditMode) return;
    if (availableOrganizations.length === 1) {
      setFormData((previous) => ({
        ...previous,
        organizationId: String(availableOrganizations[0].id),
      }));
    }
  }, [availableOrganizations, isEditMode]);

  useEffect(() => {
    if (!formData.organizationId) {
      return;
    }

    const selectedOrganization = availableOrganizations.find(
      (organization) => String(organization.id) === String(formData.organizationId)
    );

    const organizationLocationId = selectedOrganization?.LocationId;
    if (!organizationLocationId) {
      return;
    }

    setFormData((previous) => {
      // In edit mode, locationId is already set from experienceData; don't override it.
      if (previous.locationId) {
        return previous;
      }

      return {
        ...previous,
        locationId: String(organizationLocationId),
      };
    });
  }, [availableOrganizations, formData.organizationId]);

  useEffect(() => {
    const loadMeta = async () => {
      const response = await networkAdapter.get('/api/organizers/onboarding/meta');
      if (response?.data?.locations) {
        setLocations(response.data.locations);
      }
    };

    loadMeta();
  }, []);

  // In edit mode, prefill the map/location form from the experience's Location association.
  useEffect(() => {
    if (isEditMode && experienceData?.Location) {
      prefillAndCenterFromLocation(experienceData.Location);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditMode]);

  const upcomingPreview = useMemo(() => {
    if (formData.schedules && formData.schedules.length > 0) {
      const results = [];
      formData.schedules.forEach((item) => {
        if (!item) return;
        if (item.kind === 'template') {
          const cron = item.ruleCron || buildCronExpression({ recurrenceType: item.ruleType || 'weekly', time: item._time || formData.scheduleTime, weekDays: item._weekDays || formData.scheduleDays });
          const upcoming = getUpcomingSchedulePreview({ recurrenceType: item.ruleType || 'weekly', time: item._time || formData.scheduleTime, weekDays: item._weekDays || formData.scheduleDays, cronExpression: cron, timezone: schedulePreviewTimezone, limit: 6 });
          upcoming.forEach((d) => results.push(d));
        } else if (item.kind === 'picked' && item.dateTime) {
          results.push(new Date(item.dateTime));
        }
      });
      // sort and dedupe
      const sorted = results.sort((a, b) => a - b);
      const dedup = [];
      const seen = new Set();
      sorted.forEach((d) => {
        const key = d.toISOString();
        if (!seen.has(key)) { seen.add(key); dedup.push(d); }
      });
      return dedup.slice(0, 6);
    }

    if (computedCron) {
      return getUpcomingSchedulePreview({ cronExpression: computedCron, timezone: schedulePreviewTimezone, limit: 6 });
    }

    return [];
  }, [computedCron, formData.recurrenceType, formData.scheduleDays, formData.scheduleTime, formData.schedules, schedulePreviewTimezone]);

  const scheduleCalendarAppointments = useMemo(() => {
    if (formData.schedules && formData.schedules.length > 0) {
      return formData.schedules.flatMap((item) => {
        if (!item) return [];
        if (item.kind === 'template') {
          const cron = item.ruleCron || buildCronExpression({ recurrenceType: item.ruleType || 'weekly', time: item._time || formData.scheduleTime, weekDays: item._weekDays || formData.scheduleDays });
          return getUpcomingSchedulePreview({ recurrenceType: item.ruleType || 'weekly', time: item._time || formData.scheduleTime, weekDays: item._weekDays || formData.scheduleDays, limit: 120, cronExpression: cron, timezone: schedulePreviewTimezone }).map((d, idx) => ({ id: `schedule-calendar-${item.name || 't'}-${idx + 1}-${d.toISOString()}`, title: 'Scheduled session', dateTime: d.toISOString(), source: 'Schedule Builder' }));
        }
        if (item.kind === 'picked' && item.dateTime) {
          return [{ id: `schedule-calendar-picked-${item.dateTime}`, title: 'Scheduled session', dateTime: new Date(item.dateTime).toISOString(), source: 'Schedule Builder' }];
        }
        return [];
      });
    }

    if (computedCron) {
      return getUpcomingSchedulePreview({ cronExpression: computedCron, timezone: schedulePreviewTimezone, limit: 120 }).map((sessionDate, index) => ({
        id: `schedule-calendar-appointment-${index + 1}`,
        title: 'Scheduled session',
        dateTime: sessionDate.toISOString(),
        source: 'Schedule Builder',
      }));
    }

    return [];
  }, [computedCron, formData.recurrenceType, formData.scheduleDays, formData.scheduleTime, formData.schedules, schedulePreviewTimezone]);

  const schedulePreviewSessions = useMemo(
    () => scheduleCalendarAppointments.map((appointment) => ({
      id: appointment.id,
      title: appointment.title,
      dateTime: appointment.dateTime,
      availableSpots:
        Number.isFinite(Number(formData.capacity)) && Number(formData.capacity) > 0
          ? Number(formData.capacity)
          : 0,
      totalSpots:
        Number.isFinite(Number(formData.capacity)) && Number(formData.capacity) > 0
          ? Number(formData.capacity)
          : 0,
    })),
    [formData.capacity, scheduleCalendarAppointments]
  );

  const previewExperienceData = useMemo(() => {
    const normalizedCapacity = Number.isFinite(Number(formData.capacity)) && Number(formData.capacity) > 0
      ? Number(formData.capacity)
      : 0;
    const previewUpcomingSessions = (upcomingPreview || []).map((sessionDate, index) => ({
      id: `preview-session-${index + 1}`,
      dateTime: sessionDate.toISOString(),
      availableSpots: normalizedCapacity,
    }));

    let thumbnail = '';
    if (thumbnailPreviewUrl && isRenderableImageUrl(thumbnailPreviewUrl)) {
      thumbnail = thumbnailPreviewUrl;
    } else if (formData.thumbnail && isRenderableImageUrl(formData.thumbnail)) {
      thumbnail = formData.thumbnail;
    }

    const galleryImages = galleryPreviewUrls
      .filter((url) => isRenderableImageUrl(url) && url !== thumbnail)
      .map((url, idx) => ({
        imageUrl: url,
        accessibleText: `${formData.title || 'Experience'} image ${idx + 1}`,
      }));

    const images = galleryImages.slice(0, 4);

    const validTierPrices = (formData.ticketTiers || [])
      .map((tier) => Number(tier.price))
      .filter((price) => Number.isFinite(price) && price >= 0);

    const previewTicketTiers = (formData.ticketTiers || []).map((tier, index) => ({
      id: 900000 + index,
      title: tier.title || `Ticket ${index + 1}`,
      price: Number.isFinite(Number(tier.price)) ? Number(tier.price) : 0,
      description: tier.description || '',
      minAge: Number.isFinite(Number(tier.minAge)) ? Number(tier.minAge) : null,
      maxAge:
        String(tier.maxAge ?? '').trim() === '' || !Number.isFinite(Number(tier.maxAge))
          ? null
          : Number(tier.maxAge),
      userQuestionnary: Array.isArray(tier.userQuestionnary) ? tier.userQuestionnary : [],
    }));

    const previewUserQuestionnary = (formData.userQuestionnary || [])
      .filter((question) => String(question?.prompt || '').trim())
      .map((question, index) => ({
        questionKey: `preview_q_${index + 1}`,
        prompt: String(question.prompt || '').trim(),
        required: Boolean(question.required),
      }));

    const averageRating =
      PREVIEW_REVIEWS.reduce((sum, comment) => sum + Number(comment.stars || 0), 0) /
      PREVIEW_REVIEWS.length;

    return {
      id: 'preview-experience',
      experienceCode: 'preview-experience',
      title: formData.title || 'Untitled Experience',
      subtitle: formData.subtitle || '',
      detailsMetadata: formData.detailsMetadata,
      description: formData.description || '',
      thumbnail,
      images,
      ratings: Number.isFinite(averageRating) ? averageRating : 0,
      commentCount: PREVIEW_REVIEWS.length,
      comments: PREVIEW_REVIEWS,
      organizers: [
        {
          id: userDetails?.id || 'preview-organizer',
          firstName: userDetails?.firstName || 'Organizer',
          lastName: userDetails?.lastName || '',
          name: `${userDetails?.firstName || 'Organizer'} ${userDetails?.lastName || ''}`.trim(),
          profilePicture: userDetails?.profilePicture || '',
          description: userDetails?.organizerProfile?.description || '',
          socials: {},
          contact: {
            email: userDetails?.email || '',
            phoneNumber: userDetails?.phoneNumber || '',
          },
          organizerComments: [],
          organizerAverageRating: null,
          organizerCommentCount: 0,
        },
      ],
      Location: previewLocation || {
        name: 'Location details unavailable',
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: '',
        timezone: schedulePreviewTimezone || 'UTC',
        coordinates: {
          coordinates: [],
        },
      },
      price: validTierPrices.length > 0 ? Math.min(...validTierPrices) : 0,
      duration: Number(formData.duration) || 0,
      previewUpcomingSessions,
      TicketTiers: previewTicketTiers,
      userQuestionnary: previewUserQuestionnary,
    };
  }, [
    formData.title,
    formData.detailsMetadata,
    formData.subtitle,
    formData.description,
    formData.thumbnail,
    thumbnailPreviewUrl,
    formData.capacity,
    formData.duration,
    formData.recurrenceType,
    formData.scheduleDays,
    formData.scheduleTime,
    formData.ticketTiers,
    formData.userQuestionnary,
    galleryPreviewUrls,
    previewLocation,
    schedulePreviewTimezone,
    userDetails,
    upcomingPreview,
  ]);

  const inlineValidation = useMemo(
    () => ({
      organizationId: !formData.organizationId ? 'Organization is required.' : '',
      locationId:
        !formData.locationId && !savedLocalLocation
          ? 'Choose an existing location or create one below.'
          : '',
      title: !String(formData.title || '').trim() ? 'Experience title is required.' : '',
      capacity:
        !Number.isFinite(Number(formData.capacity)) || Number(formData.capacity) <= 0
          ? 'Capacity must be greater than 0.'
          : '',
      duration:
        !Number.isFinite(Number(formData.duration)) || Number(formData.duration) <= 0
          ? 'Duration must be greater than 0 minutes.'
          : '',
      // Schedule is optional: allow creating experiences without schedules configured.
    }),
    [computedCron, formData.capacity, formData.duration, formData.locationId, formData.organizationId, formData.title, savedLocalLocation, formData.schedules]
  );

  const dismissToast = () => setToastMessage('');

  const showToast = (type, message) => {
    setToastType(type);
    setToastMessage(message);
  };

  const trackCreateExperienceMetric = useCallback(
    (metricName, metadata = {}) => {
      const payload = {
        metricName,
        metadata,
        at: new Date().toISOString(),
      };

      if (typeof window !== 'undefined') {
        window.__createExperienceTelemetry = window.__createExperienceTelemetry || [];
        window.__createExperienceTelemetry.push(payload);
      }

      if (isDevelopment) {
        console.info('[CreateExperienceTelemetry]', payload);
      }
    },
    [isDevelopment]
  );

  const setField = (fieldName, value) => {
    setFormData((previous) => {
      const next = { ...previous, [fieldName]: value };
      // Detect schedule changes in edit mode
      if (isEditMode && fieldName === 'schedules' && originalScheduleSnapshotRef.current !== null) {
        const changed = serializeSchedules(value) !== originalScheduleSnapshotRef.current;
        setScheduleChangedFromOriginal(changed);
      }
      return next;
    });
  };

  const toggleWeekday = (dayValue) => {
    setFormData((previous) => {
      const alreadySelected = previous.scheduleDays.includes(dayValue);
      const nextDays = alreadySelected
        ? previous.scheduleDays.filter((value) => value !== dayValue)
        : [...previous.scheduleDays, dayValue].sort((a, b) => a - b);

      return { ...previous, scheduleDays: nextDays };
    });
  };

  const updateTicketTier = (index, fieldName, value) => {
    setFormData((previous) => {
      const nextTicketTiers = [...previous.ticketTiers];
      nextTicketTiers[index] = {
        ...nextTicketTiers[index],
        [fieldName]: value,
      };

      return {
        ...previous,
        ticketTiers: nextTicketTiers,
      };
    });

    setTicketTierErrors((previous) => {
      const nextErrors = [...previous];
      nextErrors[index] = {
        ...(nextErrors[index] || defaultTicketTierErrorState),
        [fieldName]: false,
      };

      if (fieldName === 'minAge' || fieldName === 'maxAge') {
        nextErrors[index].minAge = false;
        nextErrors[index].maxAge = false;
      }

      return nextErrors;
    });
  };

  const addTicketTier = () => {
    setFormData((previous) => ({
      ...previous,
      ticketTiers: [...previous.ticketTiers, { ...defaultTicketTier, userQuestionnary: [] }],
    }));

    setTicketTierErrors((previous) => [...previous, { ...defaultTicketTierErrorState }]);
  };

  const removeTicketTier = (index) => {
    setFormData((previous) => {
      if (previous.ticketTiers.length === 1) {
        return previous;
      }

      return {
        ...previous,
        ticketTiers: previous.ticketTiers.filter((_, tierIndex) => tierIndex !== index),
      };
    });

    setTicketTierErrors((previous) => {
      if (previous.length === 1) {
        return previous;
      }

      return previous.filter((_, tierIndex) => tierIndex !== index);
    });
  };

  const validateTicketTierFields = () => {
    const nextTierErrors = formData.ticketTiers.map((ticketTier) => {
      const minAge = Number(ticketTier.minAge);
      const hasMaxAge = String(ticketTier.maxAge ?? '').trim() !== '';
      const maxAge = hasMaxAge ? Number(ticketTier.maxAge) : null;

      const titleError = !ticketTier.title.trim();
      const priceError =
        Number(ticketTier.price) < 0 || Number.isNaN(Number(ticketTier.price));
      const minAgeError = !Number.isInteger(minAge) || minAge < 0;
      const maxAgeError =
        hasMaxAge && (!Number.isInteger(maxAge) || maxAge <= minAge);

      return {
        title: titleError,
        price: priceError,
        minAge: minAgeError,
        maxAge: Boolean(maxAgeError),
      };
    });

    setTicketTierErrors(nextTierErrors);

    return nextTierErrors.every(
      (tierError) =>
        !tierError.title &&
        !tierError.price &&
        !tierError.minAge &&
        !tierError.maxAge
    );
  };

  const validatePayload = () => {
    const hasAnyLocation = Boolean(formData.locationId) || Boolean(savedLocalLocation);
    if (!formData.organizationId || !hasAnyLocation) {
      return 'Select an organization and location.';
    }

    if (!formData.title || !formData.capacity || !formData.duration) {
      return 'Title, capacity, and duration are required.';
    }

    // Client-side schedule validation: catch common payload errors before sending
    // to the server to provide faster feedback (server will still validate).
    if (Array.isArray(formData.schedules) && formData.schedules.length > 0) {
      for (let i = 0; i < formData.schedules.length; i += 1) {
        const item = formData.schedules[i];
        if (!item) continue;

        if (item.kind === 'picked') {
          if (!item.dateTime || String(item.dateTime).trim() === '') {
            return `schedules[${i}].dateTime is required for picked occurrences.`;
          }
          if (item.endDateTime && new Date(item.endDateTime) <= new Date(item.dateTime)) {
            return `schedules[${i}].endDateTime must be after dateTime.`;
          }
        }

        if (item.kind === 'template') {
          const ruleType = String(item.ruleType || 'cron').trim();
          if (ruleType === 'cron') {
            const cron = item.ruleCron || buildCronExpression({ recurrenceType: item.ruleType || 'weekly', time: item._time || formData.scheduleTime, weekDays: item._weekDays || formData.scheduleDays });
            if (!cron) {
              return `Schedule ${i} is improperly configured.`;
            }
          }
          if (ruleType === 'datetime' && !item.ruleDateTime) {
            return `Date  ${i} is improperly configured.`;
          }
        }
      }
    }

    const hasInvalidTier = !validateTicketTierFields();
    const hasInvalidTierQuestion = formData.ticketTiers.some((ticketTier) =>
      (ticketTier.userQuestionnary || []).some((question) => !question.prompt.trim())
    );

    if (hasInvalidTier) {
      return 'Please fix the highlighted ticket tier fields.';
    }
    if (hasInvalidTierQuestion) {
      return 'Each ticket tier question must include prompt text.';
    }

    const hasInvalidQuestion = formData.userQuestionnary.some(
      (question) => !question.prompt.trim()
    );

    if (hasInvalidQuestion) {
      return 'Each user question must include prompt text.';
    }

    return '';
  };

  const collectValidationErrors = () => {
    const errors = [];

    if (inlineValidation.organizationId) {
      errors.push(inlineValidation.organizationId);
    }
    if (inlineValidation.locationId) {
      errors.push(inlineValidation.locationId);
    }
    if (inlineValidation.title) {
      errors.push(inlineValidation.title);
    }
    if (inlineValidation.capacity) {
      errors.push(inlineValidation.capacity);
    }
    if (inlineValidation.duration) {
      errors.push(inlineValidation.duration);
    }

    return errors;
  };

  const updateUserQuestion = (index, fieldName, value) => {
    setFormData((previous) => {
      const nextQuestions = [...previous.userQuestionnary];
      nextQuestions[index] = {
        ...nextQuestions[index],
        [fieldName]: value,
      };

      return {
        ...previous,
        userQuestionnary: nextQuestions,
      };
    });
  };

  const updateTicketTierQuestion = (tierIndex, questionIndex, fieldName, value) => {
    setFormData((previous) => {
      const nextTicketTiers = [...previous.ticketTiers];
      const tier = nextTicketTiers[tierIndex] || { ...defaultTicketTier };
      const tierQuestions = [...(tier.userQuestionnary || [])];
      tierQuestions[questionIndex] = {
        ...tierQuestions[questionIndex],
        [fieldName]: value,
      };

      nextTicketTiers[tierIndex] = {
        ...tier,
        userQuestionnary: tierQuestions,
      };

      return {
        ...previous,
        ticketTiers: nextTicketTiers,
      };
    });
  };

  const addTicketTierQuestion = (tierIndex) => {
    setFormData((previous) => {
      const nextTicketTiers = [...previous.ticketTiers];
      const tier = nextTicketTiers[tierIndex] || { ...defaultTicketTier };

      nextTicketTiers[tierIndex] = {
        ...tier,
        userQuestionnary: [
          ...(tier.userQuestionnary || []),
          { ...defaultTicketTierQuestion },
        ],
      };

      return {
        ...previous,
        ticketTiers: nextTicketTiers,
      };
    });
  };

  const removeTicketTierQuestion = (tierIndex, questionIndex) => {
    setFormData((previous) => {
      const nextTicketTiers = [...previous.ticketTiers];
      const tier = nextTicketTiers[tierIndex] || { ...defaultTicketTier };
      const tierQuestions = [...(tier.userQuestionnary || [])];

      nextTicketTiers[tierIndex] = {
        ...tier,
        userQuestionnary: tierQuestions.filter((_, index) => index !== questionIndex),
      };

      return {
        ...previous,
        ticketTiers: nextTicketTiers,
      };
    });
  };

  const addUserQuestion = () => {
    setFormData((previous) => ({
      ...previous,
      userQuestionnary: [...previous.userQuestionnary, { ...defaultUserQuestion }],
    }));
  };

  const removeUserQuestion = (index) => {
    setFormData((previous) => {
      return {
        ...previous,
        userQuestionnary: previous.userQuestionnary.filter(
          (_, questionIndex) => questionIndex !== index
        ),
      };
    });
  };

  const setNewLocationField = (fieldName, value) => {
    setNewLocationForm((previous) => ({
      ...previous,
      [fieldName]: value,
    }));
  };

  const resetNewLocationForm = () => {
    setNewLocationForm({
      name: '',
      country: '',
      state: '',
      city: '',
      street: '',
      zipCode: '',
      notes: '',
      timezone: '',
    });
    setLocationMapPoint(null);
  };

  const resolveTimezoneFromCoordinates = useCallback(async (latitude, longitude) => {
    const nextLatitude = Number(latitude);
    const nextLongitude = Number(longitude);

    if (!Number.isFinite(nextLatitude) || !Number.isFinite(nextLongitude)) {
      return;
    }

    try {
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(nextLatitude)}&longitude=${encodeURIComponent(nextLongitude)}&current=temperature_2m&timezone=auto`
      );

      if (!response.ok) {
        return;
      }

      const result = await response.json();
      const timezone = String(result?.timezone || '').trim();

      if (!timezone) {
        return;
      }

      setNewLocationForm((previous) => ({
        ...previous,
        timezone,
      }));
    } catch (_error) {}
  }, []);

  const geocodeFromLocationForm = useCallback(
    async (locationFormValues) => {
      const normalizedStreet = String(locationFormValues.street || '').trim();
      const normalizedCity = String(locationFormValues.city || '').trim();
      const normalizedState = String(locationFormValues.state || '').trim();
      const normalizedZipCode = String(locationFormValues.zipCode || '').trim();
      const normalizedCountry = String(locationFormValues.country || '').trim();
      const countryCode = countryOptions.find(
        (countryOption) =>
          String(countryOption.name || '').toLowerCase() === normalizedCountry.toLowerCase()
      )?.code;

      const fullQuery = [
        normalizedStreet,
        normalizedCity,
        normalizedState,
        normalizedZipCode,
        normalizedCountry,
      ]
        .filter(Boolean)
        .join(', ');

      if (!fullQuery) {
        setLocationGeocodeDebug({
          status: 'waiting-for-address',
          fullQuery: '',
          attemptedQueries: [],
          matchedQuery: '',
          matchedDisplayName: '',
          matchedCoordinates: '',
          error: '',
        });
        return;
      }

      if (!normalizedZipCode && !normalizedCity && !normalizedStreet && !normalizedCountry) {
        setLocationGeocodeDebug({
          status: 'waiting-for-more-detail',
          fullQuery,
          attemptedQueries: [],
          matchedQuery: '',
          matchedDisplayName: '',
          matchedCoordinates: '',
          error: 'Enter country, city, zip code, or street to geocode.',
        });
        return;
      }

      const queryVariants = [
        fullQuery,
        [normalizedCity, normalizedState, normalizedZipCode, normalizedCountry]
          .filter(Boolean)
          .join(', '),
        [normalizedStreet, normalizedCity, normalizedCountry]
          .filter(Boolean)
          .join(', '),
        [normalizedZipCode, normalizedCountry]
          .filter(Boolean)
          .join(', '),
        normalizedCountry,
      ].filter(Boolean);

      const uniqueQueries = [...new Set(queryVariants)];

      if (geocodeAbortControllerRef.current) {
        geocodeAbortControllerRef.current.abort();
      }

      const requestId = geocodeRequestIdRef.current + 1;
      geocodeRequestIdRef.current = requestId;
      const abortController = new AbortController();
      geocodeAbortControllerRef.current = abortController;

      setIsGeocodingLocationForm(true);
      setLocationGeocodeDebug({
        status: 'searching',
        fullQuery,
        attemptedQueries: [],
        matchedQuery: '',
        matchedDisplayName: '',
        matchedCoordinates: '',
        error: '',
      });

      try {
        const attemptLogs = [];

        for (const locationQuery of uniqueQueries) {
          const cachedResult = geocodeCacheRef.current.get(locationQuery);

          if (cachedResult) {
            attemptLogs.push(`${locationQuery} -> cache hit`);

            if (requestId !== geocodeRequestIdRef.current) {
              return;
            }

            setLocationMapPoint({ lat: cachedResult.lat, lon: cachedResult.lon });
            resolveTimezoneFromCoordinates(cachedResult.lat, cachedResult.lon);
            setLocationGeocodeDebug({
              status: 'matched',
              fullQuery,
              attemptedQueries: attemptLogs,
              matchedQuery: locationQuery,
              matchedDisplayName: String(cachedResult.display_name || ''),
              matchedCoordinates: `${cachedResult.lat}, ${cachedResult.lon}`,
              error: '',
            });
            return;
          }

          const queryParams = new URLSearchParams({
            format: 'jsonv2',
            addressdetails: '1',
            limit: '1',
            'accept-language': 'en',
            q: locationQuery,
          });

          if (countryCode) {
            queryParams.set('countrycodes', String(countryCode).toLowerCase());
          }

          const response = await fetch(
            `https://nominatim.openstreetmap.org/search?${queryParams.toString()}`,
            { signal: abortController.signal }
          );

          if (!response.ok) {
            attemptLogs.push(`${locationQuery} -> HTTP ${response.status}`);
            continue;
          }

          const result = await response.json();
          const results = Array.isArray(result) ? result : [];

          attemptLogs.push(`${locationQuery} -> ${results.length} result(s)`);

          if (!results[0]) {
            continue;
          }

          geocodeCacheRef.current.set(locationQuery, results[0]);

          if (requestId !== geocodeRequestIdRef.current) {
            return;
          }

          setLocationMapPoint({ lat: results[0].lat, lon: results[0].lon });
          resolveTimezoneFromCoordinates(results[0].lat, results[0].lon);
          setLocationGeocodeDebug({
            status: 'matched',
            fullQuery,
            attemptedQueries: attemptLogs,
            matchedQuery: locationQuery,
            matchedDisplayName: String(results[0].display_name || ''),
            matchedCoordinates: `${results[0].lat}, ${results[0].lon}`,
            error: '',
          });
          return;
        }

        if (requestId !== geocodeRequestIdRef.current) {
          return;
        }

        setLocationGeocodeDebug({
          status: 'no-match',
          fullQuery,
          attemptedQueries: attemptLogs,
          matchedQuery: '',
          matchedDisplayName: '',
          matchedCoordinates: '',
          error: 'No matching location found for the current input.',
        });
      } catch (error) {
        if (error?.name === 'AbortError') {
          return;
        }

        showToast('error', 'Unable to update map location right now.');
        setLocationGeocodeDebug({
          status: 'error',
          fullQuery,
          attemptedQueries: [],
          matchedQuery: '',
          matchedDisplayName: '',
          matchedCoordinates: '',
          error: 'Geocoding request failed before a match was found.',
        });
      } finally {
        if (requestId === geocodeRequestIdRef.current) {
          setIsGeocodingLocationForm(false);
        }

        if (geocodeAbortControllerRef.current === abortController) {
          geocodeAbortControllerRef.current = null;
        }
      }
    },
    [countryOptions, resolveTimezoneFromCoordinates]
  );

  const prefillAndCenterFromLocation = useCallback(async (location) => {
    if (!location) {
      return;
    }

    const coordinatesArray = location?.coordinates?.coordinates;
    const longitudeFromGeoPoint = Array.isArray(coordinatesArray)
      ? Number(coordinatesArray[0])
      : null;
    const latitudeFromGeoPoint = Array.isArray(coordinatesArray)
      ? Number(coordinatesArray[1])
      : null;
    const hasValidGeoPoint =
      Number.isFinite(longitudeFromGeoPoint) &&
      Number.isFinite(latitudeFromGeoPoint) &&
      longitudeFromGeoPoint >= -180 &&
      longitudeFromGeoPoint <= 180 &&
      latitudeFromGeoPoint >= -90 &&
      latitudeFromGeoPoint <= 90;

    const locationQuery = [
      location.street,
      location.city,
      location.state,
      location.zipCode,
      location.country,
    ]
      .filter(Boolean)
      .join(', ')
      .trim();

    setNewLocationForm((previous) => ({
      ...previous,
      name: String(location.name || '').trim() || previous.name,
      country: String(location.country || '').trim() || previous.country,
      state: String(location.state || '').trim() || previous.state,
      city: String(location.city || '').trim() || previous.city,
      street: String(location.street || '').trim() || previous.street,
      zipCode: String(location.zipCode || '').trim() || previous.zipCode,
      timezone: String(location.timezone || '').trim() || previous.timezone,
    }));

    if (hasValidGeoPoint) {
      setLocationMapPoint({
        lat: String(latitudeFromGeoPoint),
        lon: String(longitudeFromGeoPoint),
      });
      resolveTimezoneFromCoordinates(latitudeFromGeoPoint, longitudeFromGeoPoint);
      return;
    }

    if (!locationQuery) {
      return;
    }

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=1&q=${encodeURIComponent(locationQuery)}`
      );

      if (!response.ok) {
        throw new Error('OpenStreetMap search failed');
      }

      const result = await response.json();
      const results = Array.isArray(result) ? result : [];
      if (results[0]) {
        setLocationMapPoint({ lat: results[0].lat, lon: results[0].lon });
        resolveTimezoneFromCoordinates(results[0].lat, results[0].lon);
      }
    } catch (_error) {}
  }, [resolveTimezoneFromCoordinates]);

  const applyAddressFieldsFromOpenStreetMap = useCallback((address, displayName = '') => {
    const houseNumber = String(address?.house_number || '').trim();
    const streetName = [address?.house_number, address?.road].filter(Boolean).join(' ').trim();
    const cityName =
      address?.city ||
      address?.town ||
      address?.village ||
      address?.municipality ||
      address?.hamlet ||
      '';
    const fallbackName = String(displayName || '').split(',')[0].trim();
    const nextCountry = String(address?.country || '').trim();
    const nextState = String(address?.state || '').trim();
    const nextZipCode = String(address?.postcode || '').trim();

    setNewLocationForm((previous) => ({
      ...previous,
      name: fallbackName || previous.name,
      country: nextCountry || previous.country,
      state: nextState || previous.state,
      city: cityName || previous.city,
      street: streetName || previous.street,
      zipCode: nextZipCode || previous.zipCode,
    }));

    if (!houseNumber) {
      setToastType('warning');
      setToastMessage('This location may not include an address number. Consider adding it manually.');
    }
  }, []);

  const reverseGeocodeMapPoint = useCallback(
    async (latitude, longitude) => {
      setIsResolvingMapPoint(true);

      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(latitude)}&lon=${encodeURIComponent(longitude)}&addressdetails=1`
        );

        if (!response.ok) {
          throw new Error('OpenStreetMap reverse lookup failed');
        }

        const result = await response.json();
        applyAddressFieldsFromOpenStreetMap(result?.address || {}, result?.display_name || '');
      } catch (_error) {
        showToast('error', 'Unable to resolve address from selected map point.');
      }

      setIsResolvingMapPoint(false);
    },
    [applyAddressFieldsFromOpenStreetMap]
  );

  const validateNewLocationForm = () => {
    const requiredFields = ['name', 'country', 'state', 'city', 'street', 'zipCode'];
    const hasMissingRequiredField = requiredFields.some(
      (fieldName) => !String(newLocationForm[fieldName] || '').trim()
    );

    if (hasMissingRequiredField) {
      return 'Please complete all required location fields.';
    }

    if (newLocationDuplicateNameError) {
      return newLocationDuplicateNameError;
    }

    if (!hasValidNewLocationCoordinates) {
      return 'Select a location from OpenStreetMap search results to set map coordinates.';
    }

    return '';
  };

  const handleSaveLocalLocation = () => {
    const validationError = validateNewLocationForm();
    if (validationError) {
      showToast('error', validationError);
      return;
    }

    setSavedLocalLocation({
      name: String(newLocationForm.name || '').trim(),
      country: String(newLocationForm.country || '').trim(),
      state: String(newLocationForm.state || '').trim(),
                             city: String(newLocationForm.city || '').trim(),
      street: String(newLocationForm.street || '').trim(),
      zipCode: String(newLocationForm.zipCode || '').trim(),
      notes: String(newLocationForm.notes || '').trim(),
      timezone: String(newLocationForm.timezone || '').trim(),
      latitude: Number(locationMapPoint?.lat),
      longitude: Number(locationMapPoint?.lon),
    });
    setField('locationId', '');
    setIsEditingSavedLocation(false);
  };

  const handleEditSavedLocation = () => {
    if (!savedLocalLocation) {
      return;
    }

    setNewLocationForm((previous) => ({
      ...previous,
      name: String(savedLocalLocation.name || '').trim(),
      country: String(savedLocalLocation.country || '').trim(),
      state: String(savedLocalLocation.state || '').trim(),
      city: String(savedLocalLocation.city || '').trim(),
      street: String(savedLocalLocation.street || '').trim(),
      zipCode: String(savedLocalLocation.zipCode || '').trim(),
      notes: String(savedLocalLocation.notes || '').trim(),
      timezone: String(savedLocalLocation.timezone || '').trim(),
    }));
    setLocationMapPoint({
      lat: String(savedLocalLocation.latitude),
      lon: String(savedLocalLocation.longitude),
    });
    setIsEditingSavedLocation(true);
  };

  const submitExperience = async () => {
    const validationError = validatePayload();
    if (validationError) {
      showToast('error', validationError);
      return;
    }

    setIsSubmitting(true);

    const uploadMedia = async (file, kind) => {
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
    };

    let thumbnailObjectKey = formData.thumbnail || null;
    let galleryObjectKeys = [];

    try {
      if (thumbnailFile) {
        thumbnailObjectKey = await uploadMedia(thumbnailFile, 'experience-thumbnail');
      }

      if (galleryFiles.length > 0) {
        galleryObjectKeys = await Promise.all(
          galleryFiles.map((file) => uploadMedia(file, 'experience-gallery'))
        );
      }
    } catch (_error) {
      setIsSubmitting(false);
      showToast('error', 'Image upload failed. Please try again.');
      return;
    }

    let resolvedLocationId = parsePositiveInteger(formData.locationId);

    if (!Number.isInteger(resolvedLocationId) && savedLocalLocation) {
      const organizationId = Number(formData.organizationId);
      if (!Number.isInteger(organizationId)) {
        setIsSubmitting(false);
        showToast('error', 'Select an organization before saving a meeting point.');
        return;
      }

      const locationCreateResponse = await networkAdapter.post(
        `/api/organizers/organizations/${organizationId}/locations`,
        {
          name: savedLocalLocation.name,
          country: savedLocalLocation.country,
          state: savedLocalLocation.state,
          city: savedLocalLocation.city,
          street: savedLocalLocation.street,
          zipCode: savedLocalLocation.zipCode,
          notes: savedLocalLocation.notes || null,
          latitude: Number(savedLocalLocation.latitude),
          longitude: Number(savedLocalLocation.longitude),
          timezone: savedLocalLocation.timezone || null,
        }
      );

      if (locationCreateResponse?.errors?.length) {
        setIsSubmitting(false);
        showToast('error', locationCreateResponse.errors[0]);
        return;
      }

      const createdLocation = locationCreateResponse?.data?.location;
      if (!createdLocation?.id) {
        setIsSubmitting(false);
        showToast('error', 'Meeting point could not be created. Please comment your address and try again.');
        return;
      }

      resolvedLocationId = parsePositiveInteger(createdLocation.id);
      setLocations((previous) => {
        const nextLocations = [...previous.filter((location) => location.id !== createdLocation.id), createdLocation];

        return nextLocations.sort((left, right) => {
          const leftCountry = String(left.country || '');
          const rightCountry = String(right.country || '');
          if (leftCountry !== rightCountry) {
            return leftCountry.localeCompare(rightCountry);
          }

          const leftState = String(left.state || '');
          const rightState = String(right.state || '');
          if (leftState !== rightState) {
            return leftState.localeCompare(rightState);
          }

          return String(left.city || '').localeCompare(String(right.city || ''));
        });
      });
      setField('locationId', String(createdLocation.id));
    }

    if (!resolvedLocationId) {
      setIsSubmitting(false);
      showToast('error', 'Select an existing location or save a local meeting point first.');
      return;
    }

    const payload = {
      organizationId: Number(formData.organizationId),
      locationId: resolvedLocationId,
      title: formData.title,
      subtitle: formData.subtitle || null,
      detailsMetadata: formData.detailsMetadata,
      description: formData.description || null,
      thumbnail: thumbnailObjectKey,
      capacity: Number(formData.capacity),
      duration: Number(formData.duration),
      schedules: (formData.schedules || []).map((s) => {
        if (!s) return null;
        if (s.kind === 'template') {
          const computedRuleCron = s.ruleCron || buildCronExpression({ recurrenceType: s.ruleType || 'weekly', time: s._time || formData.scheduleTime, weekDays: s._weekDays || formData.scheduleDays });
          return {
            kind: 'template',
            name: s.name || null,
            ruleType: s.ruleType || 'cron',
            ruleCron: computedRuleCron || null,
            ruleDateTime: s.ruleDateTime || null,
            timezone: s.timezone || schedulePreviewTimezone || 'UTC',
            durationMinutes:
              s.durationMinutes != null && String(s.durationMinutes).trim() !== ''
                ? Number(s.durationMinutes)
                : null,
            capacity:
              s.capacity != null && String(s.capacity).trim() !== ''
                ? Number(s.capacity)
                : null,
          };
        }

        if (s.kind === 'picked') {
          return {
            kind: 'picked',
            dateTime: s.dateTime || null,
            endDateTime: s.endDateTime || null,
            capacity: s.capacity != null ? Number(s.capacity) : null,
            note: s.note || null,
          };
        }

        return null;
      }).filter(Boolean),
      images: galleryObjectKeys,
      ticketTiers: formData.ticketTiers.map((ticketTier) => ({
        title: ticketTier.title,
        price: Number(ticketTier.price),
        description: ticketTier.description || null,
        minAge: Number(ticketTier.minAge),
        maxAge:
          String(ticketTier.maxAge ?? '').trim() === ''
            ? null
            : Number(ticketTier.maxAge),
        userQuestionnary: (ticketTier.userQuestionnary || [])
          .filter((question) => question.prompt.trim())
          .map((question) => ({
            prompt: question.prompt.trim(),
            required: Boolean(question.required),
          })),
      })),
      userQuestionnary: formData.userQuestionnary
        .filter((question) => question.prompt.trim())
        .map((question) => ({
          prompt: question.prompt.trim(),
          required: Boolean(question.required),
        })),
    };

    let response;
    if (isEditMode && experienceData?.id) {
      response = await networkAdapter.patch(`/api/experiences/manage/${experienceData.id}`, payload);
    } else {
      response = await networkAdapter.post('/api/experiences/manage', payload);
    }
    setIsSubmitting(false);

    if (response?.errors?.length) {
      showToast('error', response.errors[0]);
      return;
    }

    showToast('success', isEditMode ? 'Experience updated successfully.' : 'Experience created successfully.');

    setThumbnailFile(null);
    if (thumbnailPreviewUrl) {
      URL.revokeObjectURL(thumbnailPreviewUrl);
      setThumbnailPreviewUrl('');
    }
    setGalleryFiles([]);
    galleryPreviewUrls.forEach((previewUrl) => URL.revokeObjectURL(previewUrl));
    setGalleryPreviewUrls([]);
    setIsPreviewMode(false);
    navigate('/organizer-profile?tab=Experiences', { replace: true });
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const validationError = validatePayload();
    if (validationError) {
      showToast('error', validationError);
      return;
    }

    setIsPreviewMode(true);
  };

  const hasOrganizerProfile = Boolean(userDetails?.organizerProfile);

  useEffect(() => {
    if (!selectedLocation) {
      return;
    }

    prefillAndCenterFromLocation(selectedLocation);
  }, [prefillAndCenterFromLocation, selectedLocation]);

  useEffect(() => {
    const geocodeInput = {
      street: newLocationForm.street,
      city: newLocationForm.city,
      state: newLocationForm.state,
      zipCode: newLocationForm.zipCode,
      country: newLocationForm.country,
    };

    const locationQuery = [
      geocodeInput.street,
      geocodeInput.city,
      geocodeInput.state,
      geocodeInput.zipCode,
      geocodeInput.country,
    ]
      .map((value) => String(value || '').trim())
      .filter(Boolean)
      .join(', ');

    if (!locationQuery) {
      return;
    }

    const timeoutId = setTimeout(() => {
      geocodeFromLocationForm(geocodeInput);
    }, 300);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [
    geocodeFromLocationForm,
    newLocationForm.city,
    newLocationForm.country,
    newLocationForm.state,
    newLocationForm.street,
    newLocationForm.zipCode,
  ]);

  if (!hasOrganizerProfile) {
    return <Navigate to="/organizer-profile" replace />;
  }

  if (isPreviewMode) {
    return (
      <div className="container mx-auto p-4 md:p-6 min-h-[700px] space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="inline-flex items-center rounded-full bg-amber-100 text-amber-800 px-3 py-1 text-xs font-semibold">
            Preview Mode
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              className="px-4 py-2 rounded border border-slate-300 text-slate-700"
              onClick={() => {
                // Clean up blob URLs when leaving preview mode
                if (thumbnailPreviewUrl) {
                  URL.revokeObjectURL(thumbnailPreviewUrl);
                  setThumbnailPreviewUrl('');
                }
                galleryPreviewUrls.forEach((previewUrl) => URL.revokeObjectURL(previewUrl));
                setGalleryPreviewUrls([]);
                dismissToast();
                setIsPreviewMode(false);
              }}
            >
              Back to Editing
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              className="px-4 py-2 font-bold text-white rounded bg-brand hover:bg-emerald-700 disabled:opacity-50"
              onClick={submitExperience}
            >
              {isSubmitting
                ? (isEditMode ? 'Saving Changes...' : 'Submitting Experience...')
                : (isEditMode ? 'Save Changes' : 'Submit Experience')}
            </button>
          </div>
        </div>

        {toastMessage && (
          <div className={`rounded-md border px-4 py-3 text-sm ${
            toastType === 'success'
              ? 'border-green-300 bg-green-50 text-green-800'
              : toastType === 'warning'
                ? 'border-amber-300 bg-amber-50 text-amber-800'
                : 'border-red-300 bg-red-50 text-red-800'
          }`}>
            <div className="flex items-start justify-between gap-4">
              <p>{toastMessage}</p>
              <button
                type="button"
                onClick={dismissToast}
                className="text-xs font-medium underline"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        <div className="bg-white shadow-md rounded p-4 md:p-6">
          <p className="text-sm font-medium text-slate-700 mb-3">Listing Tile Preview</p>
          <div className="max-w-[260px]">
            <ExperienceViewCard
              id="preview-experience"
              title={previewExperienceData.title}
              thumbnail={previewExperienceData.thumbnail}
              image={previewExperienceData.images?.[0] || null}
              ratings={previewExperienceData.ratings}
              price={previewExperienceData.price}
              disableNavigation
            />
          </div>
        </div>

        <ExperienceDetails previewData={previewExperienceData} isPreview />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 min-h-[700px]">
      <h2 className="text-3xl font-extrabold text-brand mb-2">
        {isEditMode ? 'Edit Experience' : 'Create New Experience'}
      </h2>
      <p className="text-slate-600 mb-6">
        {isEditMode
          ? 'Update the fields below and save your changes.'
          : 'Fill all required fields. Configuring a schedule is optional.'}
      </p>

      {isEditMode && scheduleChangedFromOriginal && !scheduleBannerDismissed && (
        <div className="rounded-md border border-yellow-400 bg-yellow-50 px-4 py-3 text-sm text-yellow-800 mb-6">
          <div className="flex items-start justify-between gap-4">
            <p>Schedule has been modified. You must manually sync the schedule from the Experiences tab for changes to take effect.</p>
            <button
              type="button"
              onClick={() => setScheduleBannerDismissed(true)}
              className="text-xs font-medium underline whitespace-nowrap"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {toastMessage && (
        <div className={`rounded-md border px-4 py-3 text-sm mb-6 ${
          toastType === 'success'
            ? 'border-green-300 bg-green-50 text-green-800'
            : toastType === 'warning'
              ? 'border-amber-300 bg-amber-50 text-amber-800'
              : 'border-red-300 bg-red-50 text-red-800'
        }`}>
          <div className="flex items-start justify-between gap-4">
            <p>{toastMessage}</p>
            <button
              type="button"
              onClick={dismissToast}
              className="text-xs font-medium underline"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white shadow-md rounded p-4 md:p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Organization *</label>
            {singleOrganization ? (
              <input
                className="border rounded px-3 py-2 w-full bg-slate-50 text-slate-700"
                value={singleOrganization.name}
                readOnly
              />
            ) : (
              <select
                className="border rounded px-3 py-2 w-full"
                value={formData.organizationId}
                onChange={(event) => {
                  setField('organizationId', event.target.value);
                  setField('locationId', '');
                }}
              >
                <option value="">Select organization</option>
                {availableOrganizations.map((organization) => (
                  <option key={organization.id} value={organization.id}>
                    {organization.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-700 mb-1">Location *</label>
            <select
              className="border rounded px-3 py-2 w-full"
              value={formData.locationId}
              onChange={(event) => {
                const nextLocationId = event.target.value;
                setField('locationId', nextLocationId);
                setSavedLocalLocation(null);
                setIsEditingSavedLocation(nextLocationId === '');
                if (!nextLocationId) {
                  resetNewLocationForm();
                  return;
                }
                const nextLocation = locations.find(
                  (location) => String(location.id) === String(nextLocationId)
                );
                if (nextLocation) {
                  prefillAndCenterFromLocation(nextLocation);
                }
              }}
            >
              <option value="">New Location</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name || 'Location'} - {location.city}, {location.country}
                </option>
              ))}
            </select>
          </div>

          {/* Condensed selected-location display */}
          {selectedLocation && !isEditingSavedLocation && (
            <div className="md:col-span-2 border border-slate-200 rounded p-3 bg-slate-50">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{selectedLocation.name || 'Selected location'}</p>
                  <p className="text-xs text-slate-600 mt-1">
                    {selectedLocation.street}, {selectedLocation.city}, {selectedLocation.state}, {selectedLocation.zipCode}, {selectedLocation.country}
                  </p>
                  {selectedLocation.timezone && (
                    <p className="text-xs text-slate-500 mt-1">Timezone: {selectedLocation.timezone}</p>
                  )}
                </div>
                <div className="flex items-start gap-3">
                  <LocationMiniMap
                    point={
                      selectedLocation.coordinates?.coordinates
                        ? { lat: selectedLocation.coordinates.coordinates[1], lon: selectedLocation.coordinates.coordinates[0] }
                        : null
                    }
                  />
                  <button
                    type="button"
                    className="px-3 py-2 rounded border border-slate-300 text-slate-700 text-sm"
                    onClick={() => {
                      setField('locationId', '');
                      prefillAndCenterFromLocation(selectedLocation);
                      setSavedLocalLocation(null);
                      setIsEditingSavedLocation(true);
                    }}
                  >
                    Edit
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Condensed saved-local-location display */}
          {!formData.locationId && savedLocalLocation && !isEditingSavedLocation && (
            <div className="md:col-span-2 border border-slate-200 rounded p-3 bg-slate-50">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{savedLocalLocation.name || 'Saved meeting point'}</p>
                  <p className="text-xs text-slate-600 mt-1">
                    {savedLocalLocation.street}, {savedLocalLocation.city}, {savedLocalLocation.state}, {savedLocalLocation.zipCode}, {savedLocalLocation.country}
                  </p>
                  {savedLocalLocation.notes && (
                    <p className="text-xs text-slate-600 mt-1">Notes: {savedLocalLocation.notes}</p>
                  )}
                  {savedLocalLocation.timezone && (
                    <p className="text-xs text-slate-500 mt-1">Timezone: {savedLocalLocation.timezone}</p>
                  )}
                </div>
                <div className="flex items-start gap-3">
                  <LocationMiniMap
                    point={{
                      lat: savedLocalLocation.latitude,
                      lon: savedLocalLocation.longitude,
                    }}
                  />
                  <button
                    type="button"
                    className="px-3 py-2 rounded border border-slate-300 text-slate-700 text-sm"
                    onClick={handleEditSavedLocation}
                  >
                    Edit
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* New location form (shown when "New Location" chosen or editing) */}
          {!formData.locationId && isEditingSavedLocation && (
            <div className="md:col-span-2 border border-slate-200 rounded p-3 bg-slate-50">
              <div className="flex items-center justify-between gap-2 mb-2">
                <p className="text-sm font-medium text-slate-700">Add Meeting Point</p>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
              <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-0.5">Location name *</label>
                  <input
                    className="border rounded px-3 py-1.5 w-full"
                    value={newLocationForm.name}
                    onChange={(event) => setNewLocationField('name', event.target.value)}
                  />
                  {newLocationDuplicateNameError && (
                    <p className="mt-1 text-xs text-red-600">{newLocationDuplicateNameError}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-0.5">Country *</label>
                  <select
                    className="border rounded px-3 py-1.5 w-full"
                    value={newLocationForm.country}
                    onChange={(event) => setNewLocationField('country', event.target.value)}
                  >
                    <option value="">Select country</option>
                    {countryOptions.map((countryOption) => (
                      <option key={countryOption.code} value={countryOption.name}>
                        {countryOption.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-0.5">State *</label>
                  <input
                    className="border rounded px-3 py-1.5 w-full"
                    value={newLocationForm.state}
                    onChange={(event) => setNewLocationField('state', event.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-0.5">City *</label>
                  <input
                    className="border rounded px-3 py-1.5 w-full"
                    value={newLocationForm.city}
                    onChange={(event) => setNewLocationField('city', event.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-0.5">Street *</label>
                  <input
                    className="border rounded px-3 py-1.5 w-full"
                    value={newLocationForm.street}
                    onChange={(event) => setNewLocationField('street', event.target.value)}
                  />
                  {String(newLocationForm.street || '').trim() && !hasStreetAddressNumber && (
                    <p className="mt-1 text-xs text-amber-700">
                      No address number detected in street. Consider adding it manually.
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-0.5">Zip code *</label>
                  <input
                    className="border rounded px-3 py-1.5 w-full"
                    value={newLocationForm.zipCode}
                    onChange={(event) => setNewLocationField('zipCode', event.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-0.5">Notes (optional)</label>
                  <input
                    className="border rounded px-3 py-1.5 w-full"
                    value={newLocationForm.notes}
                    onChange={(event) => setNewLocationField('notes', event.target.value)}
                  />
                </div>
                <div className="md:col-span-2">
                  <button
                    type="button"
                    className="px-3 py-1.5 rounded bg-brand text-white"
                    onClick={handleSaveLocalLocation}
                    disabled={Boolean(newLocationDuplicateNameError)}
                  >
                    Save Meeting Point
                  </button>
                </div>
              </div>

              <div className="lg:col-span-1 border border-slate-200 rounded overflow-hidden bg-white">
                <div className="px-3 py-2 border-b border-slate-200 text-xs text-slate-600">
                  {hasValidNewLocationCoordinates
                    ? `Map preview (${Number(locationMapPoint?.lat).toFixed(5)}, ${Number(locationMapPoint?.lon).toFixed(5)})`
                    : 'Map preview (click on the map or search/select a result to set geolocation)'}
                </div>
                {isResolvingMapPoint && (
                  <div className="px-3 py-2 border-b border-slate-200 text-xs text-slate-500">
                    Resolving address from selected map point...
                  </div>
                )}
                {isGeocodingLocationForm && (
                  <div className="px-3 py-2 border-b border-slate-200 text-xs text-slate-500">
                    Updating map from typed location details...
                  </div>
                )}
                <LocationPickerMap
                  point={locationMapPoint}
                  onPick={(latLng) => {
                    setLocationMapPoint({
                      lat: String(latLng.lat),
                      lon: String(latLng.lng),
                    });
                    reverseGeocodeMapPoint(latLng.lat, latLng.lng);
                    resolveTimezoneFromCoordinates(latLng.lat, latLng.lng);
                  }}
                />
              </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Title *</label>
            <input
              className="border rounded px-3 py-2 w-full"
              placeholder="Experience Title *"
              value={formData.title}
              onChange={(event) => setField('title', event.target.value)}
            />
          </div>
          <div>
            <label htmlFor="experience-details-template" className="block text-xs font-medium text-slate-700 mb-1">Details template</label>
            <select
              id="experience-details-template"
              className="border rounded px-3 py-2 w-full"
              value={formData.detailsMetadata.template}
              onChange={(event) => setField('detailsMetadata', { ...formData.detailsMetadata, template: event.target.value })}
            >
              {EXPERIENCE_DETAILS_TEMPLATES.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
            </select>
            <p className="mt-1 text-xs text-slate-500">Party uses one free occurrence. Food tour uses uploaded hero media and pinned reviews.</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Subtitle</label>
            <input
              className="border rounded px-3 py-2 w-full"
              placeholder="Subtitle"
              value={formData.subtitle}
              onChange={(event) => setField('subtitle', event.target.value)}
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-700 mb-1">Thumbnail image</label>
            <input
              className="border rounded px-3 py-2 w-full"
              type="file"
              accept="image/*"
              onChange={(event) => {
                const selectedFile = event.target.files?.[0];
                if (!selectedFile) return;
                // Do NOT revoke previous blob URL here; only revoke when preview is dismissed
                setThumbnailFile(selectedFile);
                setThumbnailPreviewUrl(URL.createObjectURL(selectedFile));
              }}
            />
          </div>
          {(thumbnailPreviewUrl || formData.thumbnail) && (
            <div className="md:col-span-2">
              <p className="text-xs text-slate-500 mb-2">Thumbnail preview</p>
              <img
                src={thumbnailPreviewUrl || formData.thumbnail}
                alt={`${formData.title || 'Experience'} thumbnail preview`}
                className="w-full max-w-sm h-44 object-cover rounded border border-slate-200"
                onError={(event) => {
                  event.currentTarget.style.display = 'none';
                }}
              />
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Capacity *</label>
            <input
              className="border rounded px-3 py-2 w-full"
              placeholder="Capacity *"
              type="number"
              min="1"
              value={formData.capacity}
              onChange={(event) => setField('capacity', event.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Duration in minutes *</label>
            <input
              className="border rounded px-3 py-2 w-full"
              placeholder="Duration in minutes *"
              type="number"
              min="1"
              value={formData.duration}
              onChange={(event) => setField('duration', event.target.value)}
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-700 mb-1">Experience images</label>
            <input
              className="border rounded px-3 py-2 w-full"
              type="file"
              accept="image/*"
              multiple
              onChange={(event) => {
                const selectedFiles = Array.from(event.target.files || []);
                // Do NOT revoke previous blob URLs here; only revoke when preview is dismissed
                setGalleryFiles(selectedFiles);
                setGalleryPreviewUrls(selectedFiles.map((file) => URL.createObjectURL(file)));
              }}
            />
            {galleryPreviewUrls.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                {galleryPreviewUrls.map((previewUrl) => (
                  <img
                    key={previewUrl}
                    src={previewUrl}
                    alt="Experience gallery preview"
                    className="w-full h-24 object-cover rounded border border-slate-200"
                  />
                ))}
              </div>
            )}
            {galleryFiles.length > 0 && (
              <p className="text-xs text-slate-500 mt-2">{galleryFiles.length} image(s) selected.</p>
            )}
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-700 mb-1">Description</label>
            <textarea
              className="border rounded px-3 py-2 w-full min-h-28"
              placeholder="Description"
              value={formData.description}
              onChange={(event) => setField('description', event.target.value)}
            />
          </div>
        </div>

        <div className="border rounded p-4 bg-slate-50">
          <h3 className="font-semibold text-slate-700 mb-3">Schedule Builder</h3>
          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_20rem] gap-4">
            <div>
              <div>
                <ScheduleBuilder schedules={formData.schedules} onChange={(s) => setField('schedules', s)} timezone={schedulePreviewTimezone} />

                <div className="mt-4">
                  <p className="text-sm font-medium text-slate-700 mb-2">Upcoming schedule preview</p>
                  <p className="text-xs text-slate-500 mb-2">Times shown in {schedulePreviewTimezone}</p>
                  <ul className="text-sm text-slate-600 space-y-1">
                    {upcomingPreview.map((scheduleDate) => (
                      <li key={scheduleDate.toISOString()}>
                        {scheduleDate.toLocaleString([], {
                          timeZone: schedulePreviewTimezone,
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <SessionsPreviewPanel
              sessions={schedulePreviewSessions}
              timezone={schedulePreviewTimezone}
              showList={false}
              calendarTitle="Calendar Visualizer"
              calendarSubtitle="Hover a highlighted day for details. Click a day to pin."
              monthCount={2}
            />
          </div>
        </div>

        <div className="border rounded p-4 bg-slate-50">
          <h3 className="font-semibold text-slate-700 mb-3">Ticket Tiers</h3>
          <div className="space-y-3">
            {formData.ticketTiers.map((ticketTier, index) => (
              <div key={index} className="border border-slate-200 rounded p-3 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Tier title
                      {ticketTierErrors[index]?.title && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    <input
                      className={`border rounded px-3 py-2 w-full ${ticketTierErrors[index]?.title ? 'border-red-500' : ''}`}
                      placeholder="Tier title *"
                      value={ticketTier.title}
                      onChange={(event) => updateTicketTier(index, 'title', event.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Price
                      {ticketTierErrors[index]?.price && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    <input
                      className={`border rounded px-3 py-2 w-full ${ticketTierErrors[index]?.price ? 'border-red-500' : ''}`}
                      placeholder="Price *"
                      type="number"
                      min="0"
                      step="0.01"
                      value={ticketTier.price}
                      onChange={(event) => updateTicketTier(index, 'price', event.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Description</label>
                    <input
                      className="border rounded px-3 py-2 w-full"
                      placeholder="Description"
                      value={ticketTier.description}
                      onChange={(event) => updateTicketTier(index, 'description', event.target.value)}
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button type="button" className="px-3 py-2 rounded border border-slate-300" onClick={() => removeTicketTier(index)}>
                    Remove
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Minimum age
                      {ticketTierErrors[index]?.minAge && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    <input
                      className={`border rounded px-3 py-2 w-full ${ticketTierErrors[index]?.minAge ? 'border-red-500' : ''}`}
                      placeholder="Minimum age *"
                      type="number"
                      min="0"
                      step="1"
                      value={ticketTier.minAge}
                      onChange={(event) => updateTicketTier(index, 'minAge', event.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Maximum age (optional)
                      {ticketTierErrors[index]?.maxAge && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    <input
                      className={`border rounded px-3 py-2 w-full ${ticketTierErrors[index]?.maxAge ? 'border-red-500' : ''}`}
                      placeholder="Maximum age (optional)"
                      type="number"
                      min="0"
                      step="1"
                      value={ticketTier.maxAge}
                      onChange={(event) => updateTicketTier(index, 'maxAge', event.target.value)}
                    />
                  </div>
                </div>

                <div className="border border-slate-100 rounded p-3 bg-white">
                  <p className="text-sm font-medium text-slate-700 mb-2">Tier Questionnary</p>
                  <div className="space-y-2">
                    {(ticketTier.userQuestionnary || []).map((question, questionIndex) => (
                      <div key={`${index}-${questionIndex}`} className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                        <input
                          className="border rounded px-3 py-2 md:col-span-3"
                          placeholder="Question prompt"
                          value={question.prompt}
                          onChange={(event) =>
                            updateTicketTierQuestion(index, questionIndex, 'prompt', event.target.value)
                          }
                        />
                        <div className="flex items-center gap-2">
                          <label className="text-sm text-slate-700 flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={Boolean(question.required)}
                              onChange={(event) =>
                                updateTicketTierQuestion(index, questionIndex, 'required', event.target.checked)
                              }
                            />
                            Required
                          </label>
                          <button
                            type="button"
                            className="px-3 py-2 rounded border border-slate-300"
                            onClick={() => removeTicketTierQuestion(index, questionIndex)}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    className="mt-2 px-3 py-2 rounded bg-slate-200 text-slate-700"
                    onClick={() => addTicketTierQuestion(index)}
                  >
                    Add Tier Question
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button type="button" className="mt-3 px-4 py-2 rounded bg-slate-200 text-slate-700" onClick={addTicketTier}>
            Add Ticket Tier
          </button>
        </div>

        <div className="border rounded p-4 bg-slate-50">
          <h3 className="font-semibold text-slate-700 mb-3">User Questionnary</h3>
          <p className="text-sm text-slate-600 mb-3">These questions are answered once per reservation, not per ticket tier.</p>
          <div className="space-y-3">
            {formData.userQuestionnary.map((question, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-center">
                <input
                  className="border rounded px-3 py-2 md:col-span-3"
                  placeholder="Question prompt"
                  value={question.prompt}
                  onChange={(event) => updateUserQuestion(index, 'prompt', event.target.value)}
                />
                <div className="flex items-center gap-3">
                  <label className="text-sm text-slate-700 flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={Boolean(question.required)}
                      onChange={(event) =>
                        updateUserQuestion(index, 'required', event.target.checked)
                      }
                    />
                    Required
                  </label>
                  <button
                    type="button"
                    className="px-3 py-2 rounded border border-slate-300"
                    onClick={() => removeUserQuestion(index)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button type="button" className="mt-3 px-4 py-2 rounded bg-slate-200 text-slate-700" onClick={addUserQuestion}>
            Add Question
          </button>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full px-4 py-2 font-bold text-white rounded bg-brand hover:bg-emerald-700 disabled:opacity-50"
        >
          {isEditMode ? 'Preview Changes' : 'Preview Experience'}
        </button>
      </form>
    </div>
  );
};

export default CreateExperience;
