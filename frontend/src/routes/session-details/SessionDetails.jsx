import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { networkAdapter } from 'services/NetworkAdapter';
import Toast from 'components/ux/toast/Toast';

const statusBadgeClasses = {
  confirmed: 'bg-green-100 text-green-800',
  pending: 'bg-yellow-100 text-yellow-800',
  attended: 'bg-blue-100 text-blue-800',
  'no-show': 'bg-red-100 text-red-800',
  cancelled: 'bg-slate-100 text-slate-500',
};

const sessionStatusBadgeClasses = {
  scheduled: 'bg-blue-100 text-blue-800',
  'in-progress': 'bg-green-100 text-green-800',
  completed: 'bg-slate-100 text-slate-600',
  cancelled: 'bg-red-100 text-red-800',
  waitlisted: 'bg-yellow-100 text-yellow-800',
};

const SessionDetails = () => {
  const { sessionId } = useParams();
  const [session, setSession] = useState(null);
  const [reservations, setReservations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('error');
  const [isCancelling, setIsCancelling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const loadSessionDetails = useCallback(async () => {
    setIsLoading(true);
    setError('');

    const response = await networkAdapter.get(`/api/organizers/sessions/${sessionId}/reservations`);

    if (response?.errors?.length) {
      setError(response.errors[0] || 'Unable to load session details.');
      setIsLoading(false);
      return;
    }

    setSession(response?.data?.session || null);
    setReservations(response?.data?.reservations || []);
    setIsLoading(false);
  }, [sessionId]);

  useEffect(() => {
    loadSessionDetails();
  }, [loadSessionDetails]);

  const handleCancelSession = async () => {
    setIsCancelling(true);
    const response = await networkAdapter.patch(`/api/organizers/sessions/${sessionId}/cancel`);

    if (response?.errors?.length) {
      setToastType('error');
      setToastMessage(response.errors[0] || 'Failed to cancel session.');
      setIsCancelling(false);
      setShowCancelConfirm(false);
      return;
    }

    setToastType('success');
    setToastMessage('Session cancelled successfully.');
    setShowCancelConfirm(false);
    setIsCancelling(false);
    await loadSessionDetails();
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 min-h-[420px]">
        <div className="animate-pulse space-y-4">
          <div className="bg-slate-200 h-8 w-64 rounded" />
          <div className="bg-slate-200 h-40 rounded" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6 min-h-[420px]">
        <p className="text-red-600 mb-4">{error}</p>
        <Link to="/organizer-profile" className="text-brand hover:underline text-sm">
          ← Back to Organizer Profile
        </Link>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="container mx-auto p-6 min-h-[420px]">
        <p className="text-slate-600">Session not found.</p>
        <Link to="/organizer-profile" className="text-brand hover:underline text-sm mt-2 inline-block">
          ← Back to Organizer Profile
        </Link>
      </div>
    );
  }

  const sessionDate = new Date(session.dateTime);
  const isCancelled = session.status === 'cancelled';
  const bookedCount = session.capacity - session.availableSpots;

  return (
    <div className="container mx-auto p-4 md:p-6 min-h-[420px]">
      <Link to="/organizer-profile" className="text-brand hover:underline text-sm mb-4 inline-block">
        ← Back to Organizer Profile
      </Link>

      <div className="bg-white rounded shadow-md p-4 md:p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 mb-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">{session.experienceTitle}</h2>
            <p className="text-sm text-slate-500 mt-1">{session.organizationName}</p>
            <div className="flex flex-wrap gap-2 mt-2 items-center">
              <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${sessionStatusBadgeClasses[session.status] || 'bg-slate-100 text-slate-600'}`}>
                {session.status}
              </span>
              <span className="text-sm text-slate-600">
                {sessionDate.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                {' at '}
                {sessionDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
              </span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 text-sm text-slate-600">
            <span>{bookedCount} / {session.capacity} booked</span>
            <span>{session.availableSpots} spots remaining</span>
            {session.experienceDuration && <span>{session.experienceDuration} min</span>}
          </div>
        </div>

        {!isCancelled && (
          <div className="flex gap-2 mt-2">
            <button
              type="button"
              onClick={() => setShowCancelConfirm(true)}
              className="px-3 py-1.5 rounded border border-red-300 text-red-600 text-sm hover:bg-red-50 transition-colors"
            >
              Cancel Session
            </button>
          </div>
        )}
      </div>

      {showCancelConfirm && (
        <div className="bg-red-50 border border-red-200 rounded p-4 mb-6">
          <p className="text-sm text-red-800 mb-3">
            Are you sure you want to cancel this session? All {reservations.filter((r) => r.status !== 'cancelled').length} active reservation(s) will be cancelled.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCancelSession}
              disabled={isCancelling}
              className="px-3 py-1.5 rounded bg-red-600 text-white text-sm hover:bg-red-700 disabled:opacity-50"
            >
              {isCancelling ? 'Cancelling...' : 'Yes, Cancel Session'}
            </button>
            <button
              type="button"
              onClick={() => setShowCancelConfirm(false)}
              className="px-3 py-1.5 rounded border border-slate-300 text-slate-600 text-sm hover:bg-slate-50"
            >
              Never mind
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded shadow-md p-4 md:p-6">
        <h3 className="text-lg font-semibold text-slate-700 mb-4">
          Reservations ({reservations.length})
        </h3>

        {reservations.length === 0 ? (
          <p className="text-sm text-slate-500">No reservations have been made for this session yet.</p>
        ) : (
          <div className="space-y-4">
            {reservations.map((reservation) => (
              <div
                key={reservation.id}
                className={`border rounded-lg p-4 ${reservation.status === 'cancelled' ? 'bg-slate-50 opacity-70' : 'bg-white'}`}
              >
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2 mb-3">
                  <div>
                    <p className="font-medium text-slate-800">
                      Contact Name: {reservation.billingName}
                    </p>
                    {reservation.dayOfPhone && (
                      <p className="text-sm text-slate-600">Day-Of Phone #: {reservation.dayOfPhone}</p>
                    )}
                    {reservation.billingEmail && (
                      <p className="text-sm text-slate-600">{reservation.billingEmail}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium capitalize ${statusBadgeClasses[reservation.status] || 'bg-slate-100 text-slate-600'}`}>
                      Status: {reservation.status}
                    </span>
                    <span className="text-xs text-slate-500">
                      {reservation.confirmationCode}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-2">
                  {(reservation.ticketBreakdown || []).map((tier, index) => (
                    <span key={index} className="inline-block bg-slate-100 text-slate-700 px-2 py-1 rounded text-sm">
                      x{tier.count} {tier.tierName}
                    </span>
                  ))}
                  {(!reservation.ticketBreakdown || reservation.ticketBreakdown.length === 0) && (
                    <span className="inline-block bg-slate-100 text-slate-700 px-2 py-1 rounded text-sm">
                      {reservation.numberOfAttendees} attendee{reservation.numberOfAttendees !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                  <span>${Number(reservation.totalPrice || 0).toFixed(2)}</span>
                  {reservation.hotelName && <span>Hotel: {reservation.hotelName}</span>}
                  {reservation.comments && <span>Notes: {reservation.comments}</span>}
                  {reservation.specialRequests && <span>Special: {reservation.specialRequests}</span>}
                </div>

                {reservation.reservationAnswers?.length > 0 && (
                  <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-semibold text-slate-800 mb-3">Reservation Questions</p>
                    <div className="space-y-3 text-sm text-slate-700">
                      {reservation.reservationAnswers.map((answer, index) => (
                        <div key={`${reservation.id}-${answer.questionKey}-${index}`}>
                          <p className="font-medium text-slate-700">
                            {answer.prompt || answer.questionKey}
                          </p>
                          <p className="text-slate-600">
                            {answer.answerText || <span className="italic text-slate-400">No answer provided</span>}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {toastMessage && (
        <Toast
          type={toastType}
          message={toastMessage}
          dismissError={() => setToastMessage('')}
        />
      )}
    </div>
  );
};

export default SessionDetails;
