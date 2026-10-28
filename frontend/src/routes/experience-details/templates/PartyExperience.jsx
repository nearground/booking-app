import React, { useEffect, useMemo, useState } from 'react';
import { networkAdapter } from 'services/NetworkAdapter';
import ExperienceSessionBookingModal from '../../../components/experience-session-booking-modal/ExperienceSessionBookingModal';
import './PartyExperience.css';

const publicAttendanceQuestion = {
  questionKey: 'publicAttendance',
  type: 'boolean',
  required: false,
  prompt:
    'Show my registered profile name and avatar publicly after I check in. Optional; other guests on my booking stay private.',
};

const PartyExperience = ({
  experience,
  isPreview = false,
  initialCartEdit = null,
}) => {
  const experienceCode = experience.experienceCode || experience.id;
  const [attendance, setAttendance] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [pendingCartEdit, setPendingCartEdit] = useState(null);
  const [isLoading, setIsLoading] = useState(!isPreview);
  const previewSessions = experience.previewUpcomingSessions;

  useEffect(() => {
    let active = true;
    const loadAttendance = async () => {
      try {
        const response = await networkAdapter.get(
          `/api/experiences/${experienceCode}/attendance`
        );
        if (!active) return;
        if (!response?.data || response.errors?.length)
          throw new Error('Attendance unavailable');
        setAttendance(response.data);
        setLoadError('');
      } catch {
        if (active)
          setLoadError(
            'Event details are temporarily unavailable. Please try again shortly.'
          );
      } finally {
        if (active) setIsLoading(false);
      }
    };

    setAttendance(null);
    setLoadError('');
    setIsBookingOpen(false);
    setPendingCartEdit(null);
    setIsLoading(!isPreview);
    if (isPreview) {
      const session =
        Array.isArray(previewSessions) && previewSessions.length === 1
          ? previewSessions[0]
          : null;
      setAttendance({ session, checkedInCount: 0, attendees: [] });
      return () => {
        active = false;
      };
    }

    loadAttendance();
    const interval = window.setInterval(loadAttendance, 30000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [experienceCode, isPreview, previewSessions]);

  const session = attendance?.session;
  const sessionId = session?.id;
  const ticketTiers = useMemo(
    () => experience.TicketTiers || [],
    [experience.TicketTiers]
  );
  const freeTickets =
    ticketTiers.length > 0 &&
    ticketTiers.every(
      (tier) =>
        tier.price !== null &&
        tier.price !== undefined &&
        String(tier.price).trim() !== '' &&
        Number(tier.price) === 0
    );
  const canRegister = Boolean(
    session &&
      freeTickets &&
      session.status !== 'cancelled' &&
      session.status !== 'completed' &&
      session.status !== 'waitlisted' &&
      Number(session.availableSpots) > 0 &&
      new Date(session.dateTime).getTime() > Date.now()
  );

  useEffect(() => {
    if (!initialCartEdit || !sessionId || isPreview) return;
    if (
      String(initialCartEdit.metadata?.ScheduledExperienceId) !==
      String(sessionId)
    )
      return;
    setPendingCartEdit(initialCartEdit);
    setIsBookingOpen(true);
  }, [initialCartEdit, sessionId, isPreview]);

  const questionnaire = useMemo(
    () => [
      ...(Array.isArray(experience.userQuestionnary)
        ? experience.userQuestionnary.filter(
            (question) => question.questionKey !== 'publicAttendance'
          )
        : []),
      publicAttendanceQuestion,
    ],
    [experience.userQuestionnary]
  );
  const venue = experience.Location || {};
  const timezone = venue.timezone || 'UTC';
  const eventDate = session?.dateTime ? new Date(session.dateTime) : null;
  const dateLabel =
    eventDate && !Number.isNaN(eventDate.getTime())
      ? eventDate.toLocaleString(undefined, {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          timeZone: timezone,
          timeZoneName: 'short',
        })
      : 'Event date to be announced';
  const attendees = attendance?.attendees || [];
  const banner =
    experience.thumbnail ||
    experience.images?.[0]?.url ||
    experience.images?.[0];
  const registrationLabel = isPreview
    ? 'Registration preview'
    : isLoading
      ? 'Loading event…'
      : !session || !freeTickets
        ? 'Registration unavailable'
        : Number(session.availableSpots) === 0
          ? 'Event full'
          : !canRegister
            ? 'Registration closed'
            : 'Register for free';

  return (
    <main className="party-experience">
      <header className="party-experience__hero">
        {typeof banner === 'string' && banner ? (
          <img className="party-experience__cover" src={banner} alt="" />
        ) : null}
        <div className="party-experience__hero-content">
          <p className="party-experience__eyebrow">
            {experience.Organization?.name || 'Private venue party'}
          </p>
          <span className="party-experience__badge">
            One night · Free entry
          </span>
          <h1>{experience.title}</h1>
          {experience.subtitle ? (
            <p className="party-experience__subtitle">{experience.subtitle}</p>
          ) : null}
          <p className="party-experience__date">{dateLabel}</p>
          <p>
            {venue.name || 'Private venue'}
            {venue.city ? ` · ${venue.city}` : ''}
          </p>
        </div>
      </header>

      <div className="party-experience__layout">
        <section
          className="party-experience__story"
          aria-labelledby="party-about"
        >
          <p className="party-experience__eyebrow">
            Good people. One unforgettable night.
          </p>
          <h2 id="party-about">The party</h2>
          {(
            experience.description ||
            'Join us for a one-off celebration at a private venue.'
          )
            .split(/\n\s*\n/)
            .map((paragraph, index) => (
              <p className="party-experience__description" key={index}>
                {paragraph}
              </p>
            ))}
          <div className="party-experience__venue">
            <h3>The venue</h3>
            <p>{venue.name || 'Private venue'}</p>
            {venue.city ? (
              <p>
                {venue.city}
                {venue.country ? `, ${venue.country}` : ''}
              </p>
            ) : null}
            <p>
              Register before you arrive. Your booking confirmation is your
              entry reference.
            </p>
          </div>
        </section>

        <aside
          className="party-experience__registration"
          aria-labelledby="party-registration"
        >
          <p className="party-experience__eyebrow">You are invited</p>
          <h2 id="party-registration">Free registration</h2>
          <p>
            One event. No date selection. Reserve your place through our regular
            booking checkout.
          </p>
          {session ? (
            <p className="party-experience__date">{dateLabel}</p>
          ) : null}
          {canRegister ? (
            <p>{session.availableSpots} places available</p>
          ) : null}
          <button
            type="button"
            className="party-experience__register"
            disabled={isPreview || !canRegister || Boolean(loadError)}
            onClick={() => {
              setPendingCartEdit(null);
              setIsBookingOpen(true);
            }}
          >
            {registrationLabel}
          </button>
          <p className="party-experience__privacy">
            No payment required. Your contact details are never shown on this
            page.
          </p>
          {loadError ? <p role="alert">{loadError}</p> : null}
        </aside>

        <section
          className="party-experience__attendance"
          aria-labelledby="party-attendance"
        >
          <div className="party-experience__attendance-heading">
            <div>
              <p className="party-experience__eyebrow">At the venue</p>
              <h2 id="party-attendance">Who is here</h2>
            </div>
            <p
              role="status"
              aria-live="polite"
              className="party-experience__count"
            >
              {isLoading
                ? 'Loading check-ins…'
                : loadError
                  ? 'Check-ins unavailable'
                  : `${Number(attendance?.checkedInCount || 0)} checked in`}
            </p>
          </div>
          <p>
            Only checked-in registered guests who chose to share their profile
            appear here. Everyone else stays private.
          </p>
          {attendees.length > 0 ? (
            <ul
              className="party-experience__guests"
              aria-label="Public checked-in guests"
            >
              {attendees.map((attendee, index) => (
                <li key={`${attendee.name}-${index}`}>
                  {attendee.avatar ? (
                    <img src={attendee.avatar} alt="" />
                  ) : (
                    <span
                      className="party-experience__avatar"
                      aria-hidden="true"
                    >
                      {attendee.name?.slice(0, 1)}
                    </span>
                  )}
                  <span>{attendee.name}</span>
                </li>
              ))}
            </ul>
          ) : !isLoading && !loadError ? (
            <p>No public check-ins yet. See you on the dance floor.</p>
          ) : null}
        </section>
      </div>

      <ExperienceSessionBookingModal
        isOpen={isBookingOpen}
        onClose={() => setIsBookingOpen(false)}
        session={session}
        experienceCode={experienceCode}
        experienceTitle={experience.title}
        experienceSubtitle={experience.subtitle}
        experienceDurationMinutes={experience.duration}
        experienceThumbnail={typeof banner === 'string' ? banner : ''}
        ticketTiers={ticketTiers}
        experienceUserQuestionnary={questionnaire}
        experienceLocation={venue}
        initialCartEdit={pendingCartEdit}
        isPreview={isPreview}
      />
    </main>
  );
};

export default PartyExperience;
