import { useMemo, useState } from 'react';
import { networkAdapter } from 'services/NetworkAdapter';

const ManualBookingPanel = ({ organization }) => {
  const [sessionId, setSessionId] = useState('');
  const [ticketQuantities, setTicketQuantities] = useState({});
  const [contact, setContact] = useState({
    fullName: '',
    email: '',
    phone: '',
    contactMethod: 'email',
    paymentMethod: 'online',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [booking, setBooking] = useState(null);

  const sessions = useMemo(
    () =>
      (organization?.Experiences || organization?.Events || []).flatMap(
        (experience) =>
          (experience.ScheduledExperiences || [])
            .filter(
              (session) =>
                session.status !== 'cancelled' &&
                session.status !== 'completed' &&
                Number(session.availableSpots) > 0 &&
                new Date(session.dateTime).getTime() > Date.now()
            )
            .map((session) => ({
              ...session,
              experienceId: experience.id,
              experienceTitle: experience.title,
              ticketTiers: experience.TicketTiers || [],
            }))
      ),
    [organization]
  );
  const selectedSession = sessions.find(
    (session) => String(session.id) === sessionId
  );
  const ticketTiers = selectedSession?.ticketTiers || [];

  const selectedAttendees = ticketTiers.length
    ? ticketTiers.reduce(
        (sum, tier) => sum + Number(ticketQuantities[tier.id] || 0),
        0
      )
    : Number(ticketQuantities.general || 0);

  const totalAmount = ticketTiers.length
    ? ticketTiers.reduce(
        (sum, tier) =>
          sum +
          Number(tier.price || 0) * Number(ticketQuantities[tier.id] || 0),
        0
      )
    : 0;

  const updateContact = (field, value) => {
    setContact((current) => ({ ...current, [field]: value }));
  };

  const handleSessionChange = (value) => {
    setSessionId(value);
    setTicketQuantities({});
    setBooking(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setBooking(null);

    if (!selectedSession || selectedAttendees < 1) {
      setError('Choose a session and at least one attendee.');
      return;
    }

    setIsSubmitting(true);
    const ticketSelections = ticketTiers.length
      ? ticketTiers
          .map((tier) => ({
            ticketTierId: Number(tier.id),
            quantity: Number(ticketQuantities[tier.id] || 0),
          }))
          .filter((selection) => selection.quantity > 0)
      : [
          {
            ticketTierId: null,
            quantity: Number(ticketQuantities.general || 0),
          },
        ];

    try {
      const response = await networkAdapter.post(
        `/api/organizers/sessions/${selectedSession.id}/reservations`,
        { ...contact, ticketSelections }
      );

      if (response?.errors?.length) {
        setError(response.errors[0]);
        return;
      }

      setBooking(response?.data || null);
      setTicketQuantities({});
      setContact((current) => ({
        ...current,
        fullName: '',
        email: '',
        phone: '',
      }));
    } catch (_error) {
      setError('Unable to register this guest right now.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const buildMessageLink = () => {
    if (!booking?.phone) return '';
    const message = [
      `Booking details for ${booking.experienceTitle}`,
      `Session: ${new Date(booking.sessionDateTime).toLocaleString()}`,
      `Booking reference: ${booking.confirmationCode}`,
      `Order: ${booking.orderNumber}`,
      `Attendees: ${booking.attendeeCount}`,
      `Total: $${Number(booking.totalAmount).toFixed(2)}`,
      `Payment method: ${booking.paymentMethod === 'in_person' ? 'In person' : 'Online'}`,
    ].join('\n');

    if (booking.contactMethod === 'whatsapp') {
      const phoneDigits = booking.phone.replace(/\D/g, '');
      return phoneDigits
        ? `https://wa.me/${phoneDigits}?text=${encodeURIComponent(message)}`
        : '';
    }

    return `sms:${encodeURIComponent(booking.phone)}?body=${encodeURIComponent(message)}`;
  };

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-xl font-semibold text-slate-900">
        Register someone in person
      </h3>
      <p className="mt-1 text-sm text-slate-600">
        Reserve a spot for a guest and send their booking details using their
        preferred contact method.
      </p>
      <p className="mt-1 text-xs text-slate-500">
        The payment method is recorded with the booking; this form does not
        process a payment.
      </p>

      {sessions.length === 0 ? (
        <p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
          There are no upcoming sessions with available spots for this
          organization.
        </p>
      ) : (
        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm font-medium text-slate-700">
            Session
            <select
              className="mt-1 block w-full rounded-lg border border-slate-300 p-2.5"
              value={sessionId}
              onChange={(event) => handleSessionChange(event.target.value)}
              required
            >
              <option value="">Choose a session</option>
              {sessions.map((session) => (
                <option key={session.id} value={session.id}>
                  {session.experienceTitle} —{' '}
                  {new Date(session.dateTime).toLocaleString()} (
                  {session.availableSpots} spots left)
                </option>
              ))}
            </select>
          </label>

          {selectedSession ? (
            <fieldset className="rounded-xl border border-slate-200 p-4">
              <legend className="px-1 text-sm font-semibold text-slate-700">
                Attendees
              </legend>
              {ticketTiers.length ? (
                <div className="space-y-3">
                  {ticketTiers.map((tier) => (
                    <label
                      key={tier.id}
                      className="flex items-center justify-between gap-3 text-sm"
                    >
                      <span>
                        {tier.title || 'General'} · $
                        {Number(tier.price || 0).toFixed(2)}
                      </span>
                      <input
                        aria-label={`${tier.title || 'General'} quantity`}
                        className="w-20 rounded-lg border border-slate-300 p-2"
                        type="number"
                        min="0"
                        max={selectedSession.availableSpots}
                        value={ticketQuantities[tier.id] || ''}
                        onChange={(event) =>
                          setTicketQuantities((current) => ({
                            ...current,
                            [tier.id]: event.target.value,
                          }))
                        }
                      />
                    </label>
                  ))}
                </div>
              ) : (
                <label className="flex items-center justify-between gap-3 text-sm">
                  <span>General admission · Free</span>
                  <input
                    aria-label="General admission quantity"
                    className="w-20 rounded-lg border border-slate-300 p-2"
                    type="number"
                    min="0"
                    max={selectedSession.availableSpots}
                    value={ticketQuantities.general || ''}
                    onChange={(event) =>
                      setTicketQuantities((current) => ({
                        ...current,
                        general: event.target.value,
                      }))
                    }
                  />
                </label>
              )}
              <p className="mt-3 text-sm text-slate-600">
                {selectedAttendees} attendee{selectedAttendees === 1 ? '' : 's'}{' '}
                · Total ${totalAmount.toFixed(2)}
              </p>
            </fieldset>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm font-medium text-slate-700">
              Guest name
              <input
                className="mt-1 block w-full rounded-lg border border-slate-300 p-2.5"
                value={contact.fullName}
                onChange={(event) =>
                  updateContact('fullName', event.target.value)
                }
                maxLength={120}
                required
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Preferred contact method
              <select
                className="mt-1 block w-full rounded-lg border border-slate-300 p-2.5"
                value={contact.contactMethod}
                onChange={(event) =>
                  updateContact('contactMethod', event.target.value)
                }
              >
                <option value="email">Email</option>
                <option value="sms">Text message</option>
                <option value="whatsapp">WhatsApp</option>
              </select>
            </label>
            {contact.contactMethod === 'email' ? (
              <label className="block text-sm font-medium text-slate-700">
                Email address
                <input
                  className="mt-1 block w-full rounded-lg border border-slate-300 p-2.5"
                  type="email"
                  value={contact.email}
                  onChange={(event) =>
                    updateContact('email', event.target.value)
                  }
                  required
                />
              </label>
            ) : (
              <label className="block text-sm font-medium text-slate-700">
                Phone number
                <input
                  className="mt-1 block w-full rounded-lg border border-slate-300 p-2.5"
                  type="tel"
                  value={contact.phone}
                  onChange={(event) =>
                    updateContact('phone', event.target.value)
                  }
                  required
                />
              </label>
            )}
            <label className="block text-sm font-medium text-slate-700">
              Payment method
              <select
                className="mt-1 block w-full rounded-lg border border-slate-300 p-2.5"
                value={contact.paymentMethod}
                onChange={(event) =>
                  updateContact('paymentMethod', event.target.value)
                }
              >
                <option value="online">Online</option>
                <option value="in_person">In person</option>
              </select>
            </label>
          </div>

          {error ? (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={isSubmitting || !selectedSession}
            className="rounded-lg bg-brand px-4 py-2.5 font-semibold text-white disabled:opacity-50"
          >
            {isSubmitting ? 'Registering…' : 'Register guest'}
          </button>
        </form>
      )}

      {booking ? (
        <div
          className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4"
          role="status"
        >
          <p className="font-semibold text-emerald-900">Booking registered</p>
          <p className="mt-1 text-sm text-emerald-800">
            {booking.experienceTitle} · {booking.confirmationCode} · $
            {Number(booking.totalAmount).toFixed(2)}
          </p>
          {booking.contactMethod === 'email' ? (
            <p className="mt-2 text-sm text-emerald-800">
              {booking.delivery?.status === 'sent'
                ? `Booking details emailed to ${booking.email}.`
                : `Booking details could not be emailed. Share reference ${booking.confirmationCode} with the guest.`}
            </p>
          ) : (
            <a
              className="mt-3 inline-flex rounded-lg bg-emerald-800 px-3 py-2 text-sm font-semibold text-white"
              href={buildMessageLink()}
              target="_blank"
              rel="noreferrer"
            >
              Open{' '}
              {booking.contactMethod === 'whatsapp' ? 'WhatsApp' : 'messages'}{' '}
              to send details
            </a>
          )}
        </div>
      ) : null}
    </section>
  );
};

export default ManualBookingPanel;
