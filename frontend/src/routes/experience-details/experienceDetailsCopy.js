export const EXPERIENCE_TEMPLATE_COPY = {
  default: [
    { key: 'galleryLabel', label: 'Gallery button label', defaultValue: 'Open photos gallery' },
    { key: 'descriptionHeading', label: 'Description heading', defaultValue: "What You'll Do" },
    { key: 'descriptionFallback', label: 'Description fallback', defaultValue: 'Full experience details will be shared soon.' },
    { key: 'meetingHeading', label: 'Meeting location heading', defaultValue: "Where we'll meet" },
    { key: 'locationFallback', label: 'Missing location text', defaultValue: 'Location details unavailable' },
    { key: 'mapLoading', label: 'Map loading text', defaultValue: 'Loading map...' },
    { key: 'mapSlow', label: 'Slow map text', defaultValue: 'Map is taking longer than usual to load. Please wait a moment.' },
    { key: 'hostedBy', label: 'Organizer section heading', defaultValue: 'Hosted By' },
    { key: 'organizerFallback', label: 'Missing organizer text', defaultValue: 'Organizer details coming soon' },
    { key: 'reviewsButton', label: 'Reviews button label', defaultValue: 'Show All Reviews' },
    { key: 'reviewThanks', label: 'Review thank-you message', defaultValue: 'Thank you for your review!' },
    { key: 'noComments', label: 'Empty reviews text', defaultValue: 'No comments yet for this experience.' },
    { key: 'pinnedReviewsEyebrow', label: 'Pinned reviews eyebrow', defaultValue: 'From our guests' },
    { key: 'pinnedReviewsHeading', label: 'Pinned reviews heading', defaultValue: 'Guest favorites' },
    { key: 'pinnedReviewLabel', label: 'Pinned review label', defaultValue: 'Pinned experience review' },
  ],
  party: [
    { key: 'freeBadge', label: 'Free event badge', defaultValue: 'One night · Free entry' },
    { key: 'paidBadge', label: 'Paid event badge', defaultValue: 'One night · Paid entry' },
    { key: 'storyEyebrow', label: 'Event section eyebrow', defaultValue: 'Good people. One unforgettable night.' },
    { key: 'storyHeading', label: 'Event section heading', defaultValue: 'The party' },
    { key: 'descriptionFallback', label: 'Description fallback', defaultValue: 'Join us for a one-off celebration at a private venue.' },
    { key: 'venueHeading', label: 'Venue section heading', defaultValue: 'The venue' },
    { key: 'arrivalInstructions', label: 'Arrival instructions', defaultValue: 'Register before you arrive. Your booking confirmation is your entry reference.' },
    { key: 'registrationEyebrow', label: 'Registration eyebrow', defaultValue: 'You are invited' },
    { key: 'freeRegistrationHeading', label: 'Free registration heading', defaultValue: 'Free registration' },
    { key: 'paidRegistrationHeading', label: 'Paid registration heading', defaultValue: 'Event registration' },
    { key: 'freeRegistrationDescription', label: 'Free registration details', defaultValue: 'One event. No date selection. Reserve your place through our regular booking checkout.' },
    { key: 'paidRegistrationDescription', label: 'Paid registration details', defaultValue: 'Choose your admission ticket and reserve your place through our regular booking checkout.' },
    { key: 'freeRegisterButton', label: 'Free registration button', defaultValue: 'Register for free' },
    { key: 'paidRegisterButton', label: 'Paid registration button', defaultValue: 'Register for event' },
    { key: 'freePaymentNotice', label: 'Free payment notice', defaultValue: 'No payment required.' },
    { key: 'privacyNotice', label: 'Privacy notice', defaultValue: 'Your contact details are never shown on this page.' },
    { key: 'attendanceEyebrow', label: 'Attendance eyebrow', defaultValue: 'Attendees' },
    { key: 'attendanceHeading', label: 'Attendance heading', defaultValue: 'Who is coming' },
    { key: 'attendanceDescription', label: 'Attendance description', defaultValue: 'Registered guests who opted in to share their profile appear here. Everyone else stays private.' },
    { key: 'emptyAttendance', label: 'Empty attendance text', defaultValue: 'No public attendees yet.' },
    { key: 'pinnedReviewsEyebrow', label: 'Pinned reviews eyebrow', defaultValue: 'From our guests' },
    { key: 'pinnedReviewsHeading', label: 'Pinned reviews heading', defaultValue: 'Guest favorites' },
    { key: 'pinnedReviewLabel', label: 'Pinned review label', defaultValue: 'Pinned experience review' },
  ],
  'food-tour': [
    { key: 'heroEyebrow', label: 'Hero eyebrow', defaultValue: 'Local flavors. Lasting memories.' },
    { key: 'playVideo', label: 'Play video button', defaultValue: 'Play background video' },
    { key: 'pauseVideo', label: 'Pause video button', defaultValue: 'Pause background video' },
    { key: 'galleryButton', label: 'Gallery button', defaultValue: 'View tour photos' },
    { key: 'descriptionHeading', label: 'Description heading', defaultValue: "What You'll Do" },
    { key: 'descriptionFallback', label: 'Description fallback', defaultValue: 'Full experience details will be shared soon.' },
    { key: 'hostsHeading', label: 'Hosts heading', defaultValue: 'Meet your local hosts' },
    { key: 'locationHeading', label: 'Meeting location heading', defaultValue: "Where we'll meet" },
    { key: 'locationFallback', label: 'Missing location text', defaultValue: 'Location details unavailable' },
    { key: 'bookingLabel', label: 'Booking section label', defaultValue: 'Book this food tour' },
    { key: 'reviewsEyebrow', label: 'Pinned reviews eyebrow', defaultValue: 'From our guests' },
    { key: 'reviewsHeading', label: 'Pinned reviews heading', defaultValue: 'A taste of what guests love' },
    { key: 'pinnedReviewLabel', label: 'Pinned review label', defaultValue: 'Pinned experience review' },
  ],
};

const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

export const resolveTemplateCopy = (metadata, template) => {
  const fields = EXPERIENCE_TEMPLATE_COPY[template] || [];
  const savedCopy = metadata?.overrides?.copy;
  return Object.fromEntries(fields.map(({ key, defaultValue }) => [
    key,
    isRecord(savedCopy) && typeof savedCopy[key] === 'string'
      ? savedCopy[key]
      : defaultValue,
  ]));
};
