import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle, faPrint } from '@fortawesome/free-solid-svg-icons';
import { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';

const formatDateTime = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return String(iso);
  return d.toLocaleString([], {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const formatPrice = (value) => {
  const num = typeof value === 'string' ? parseFloat(value) : Number(value);
  if (isNaN(num)) return '$0.00';
  return `$${num.toFixed(2)}`;
};

const InfoRow = ({ label, value }) => {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs text-slate-500 uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-sm font-medium text-slate-800 break-words">{value}</p>
    </div>
  );
};

const Card = ({ title, children, className = '' }) => (
  <div className={`rounded-xl border border-slate-200 bg-white shadow-sm p-5 ${className}`}>
    {title && (
      <h2 className="text-base font-semibold text-slate-800 mb-4 pb-2 border-b border-slate-100">
        {title}
      </h2>
    )}
    {children}
  </div>
);

const BookingConfirmation = () => {
  const contentToPrint = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  const [confirmationData, setConfirmationData] = useState(null);

  const handlePrint = useReactToPrint({
    documentTitle: 'Booking Confirmation',
    removeAfterPrint: true,
  });

  useEffect(() => {
    if (!location.state?.confirmationData) {
      navigate('/');
      return;
    }
    setConfirmationData(location.state.confirmationData);
  }, [location.state, navigate]);

  if (!confirmationData) return null;

  const items = Array.isArray(confirmationData.items) ? confirmationData.items : [];
  const experienceItems = items.filter((item) => item.ProductType === 'Experience');


  const statusConfig = {
    paid: 'bg-green-100 text-green-700',
    pending: 'bg-yellow-100 text-yellow-700',
    confirmed: 'bg-blue-100 text-blue-700',
  };
  const statusClass = statusConfig[confirmationData.status] || 'bg-slate-100 text-slate-600';

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 md:py-14">
      {/* Top toolbar */}
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between mb-6 print:hidden">
        <Link
          to="/user-profile?tab=Bookings"
          data-testid="confirmation__back-link"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
        >
          ← Back to bookings
        </Link>
        <button
          type="button"
          onClick={() => handlePrint(null, () => contentToPrint.current)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
        >
          <FontAwesomeIcon icon={faPrint} className="text-slate-500" />
          Print confirmation
        </button>
      </div>

      <div ref={contentToPrint} className="space-y-5">
        {/* Banner */}
        <Card className="text-center">
          <div className="flex justify-center mb-3" aria-hidden="true">
            <FontAwesomeIcon icon={faCheckCircle} className="text-green-500 text-4xl" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800" data-testid="confirmation__heading">Booking Confirmed!</h1>
          <p className="text-slate-500 mt-2 text-sm max-w-md mx-auto">
            Your reservation is confirmed. Please keep this page for your records.
          </p>
          {confirmationData.mainContactEmail && (
            <p className="text-slate-500 mt-1 text-sm">
              A confirmation email has been sent to <span className="font-medium text-slate-700">{confirmationData.mainContactEmail}</span>.
            </p>
          )}
          <div className="mt-4 inline-flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5">
            <div className="text-left">
              <p className="text-xs text-slate-500 uppercase tracking-wide">Order number</p>
              <p className="text-sm font-mono font-semibold text-slate-800" data-testid="confirmation__order-number">
                {confirmationData.orderNumber || '—'}
              </p>
            </div>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${statusClass}`}
              data-testid="confirmation__status"
            >
              {confirmationData.status || 'pending'}
            </span>
          </div>
        </Card>

        <div className="space-y-5">
          <Card title="Main Contact">
            {confirmationData.mainContactName ||
            confirmationData.mainContactPhone ||
            confirmationData.mainContactEmail ? (
              <div className="space-y-3">
                <InfoRow label="Name" value={confirmationData.mainContactName} />
                <InfoRow label="Email" value={confirmationData.mainContactEmail} />
                <InfoRow label="Phone" value={confirmationData.mainContactPhone} />
              </div>
            ) : (
              <p className="text-sm italic text-slate-400">Not provided</p>
            )}
          </Card>

          {experienceItems.map((item, index) => {
            const meta = item.metadata || {};
            const sessionDate = formatDateTime(meta.sessionDateTime);
            const reservationAnswers = Array.isArray(meta.reservationAnswers) ? meta.reservationAnswers : [];
            const tierAnswers = Array.isArray(meta.questionnaireAnswers) ? meta.questionnaireAnswers : [];
            const dayOfPhone = meta.mainContact?.phone || null;
            const hotelName = meta.hotelName || null;
            const comments = meta.comments || null;
            const meetingAddress = meta.meetingAddress || null;

            return (
              <Card
                key={item.id || index}
                title={
                  <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2">
                    <span>{meta.experienceTitle || item.description || 'Experience'}</span>
                    {meta.confirmationCode && (
                      <span className="text-xs text-slate-500 font-semibold"># {meta.confirmationCode}</span>
                    )}
                  </div>
                }
              >
                <div className="space-y-4">
                  {dayOfPhone && <InfoRow label="Day-of Phone" value={dayOfPhone} />}
                  {sessionDate && (
                    <InfoRow label="Date &amp; Time" value={sessionDate} />
                  )}
                  {meetingAddress && (
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wide mb-0.5">Meeting Address</p>
                      <p className="text-sm font-medium text-slate-800 break-words">{meetingAddress}</p>
                    </div>
                  )}

                  {/* Ticket breakdown */}
                  {Array.isArray(meta.ticketSelections) && meta.ticketSelections.length > 0 && (
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Tickets</p>
                      <div className="divide-y divide-slate-100">
                        {meta.ticketSelections
                          .filter((t) => Number(t.quantity) > 0)
                          .map((ticket, ti) => (
                            <div
                              key={ti}
                              className="flex justify-between items-center py-1.5 text-sm"
                            >
                              <span className="text-slate-700">
                                {ticket.title}{' '}
                                <span className="text-slate-400">× {ticket.quantity}</span>
                              </span>
                              <span className="font-medium text-slate-800">
                                {formatPrice(
                                  Number(ticket.unitPrice || 0) * Number(ticket.quantity || 0)
                                )}
                              </span>
                            </div>
                          ))}
                      </div>
                      <div className="flex justify-between items-center pt-2 mt-1 border-t border-slate-200 text-sm font-semibold text-slate-800">
                        <span>Item total</span>
                        <span>{formatPrice(item.totalPrice)}</span>
                      </div>
                    </div>
                  )}

                  {reservationAnswers.length > 0 && (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm font-semibold text-slate-800 mb-3">Reservation Questions</p>
                      <div className="space-y-3">
                        {reservationAnswers.map((answer, i) => (
                          <div key={`res-${item.id || index}-${i}`} className="text-sm">
                            <p className="font-medium text-slate-700">
                              {answer.questionLabel || answer.questionKey}
                            </p>
                            <p className="text-slate-600 mt-0.5">
                              {answer.answerText || (
                                <span className="italic text-slate-400">No answer provided</span>
                              )}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {tierAnswers.length > 0 && (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm font-semibold text-slate-800 mb-3">Ticket Tier Questions</p>
                      <div className="space-y-5">
                        {Array.from(new Set(tierAnswers.map((a) => a.tierKey))).map((tierKey) => {
                          const group = tierAnswers.filter((a) => a.tierKey === tierKey);
                          const tierTitle = group[0]?.tierTitle || tierKey;
                          return (
                            <div key={`tier-${item.id || index}-${tierKey}`}>
                              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
                                {tierTitle}
                              </p>
                              <div className="space-y-2">
                                {group.map((answer, i) => (
                                  <div key={`tier-${tierKey}-${i}`} className="text-sm">
                                    <p className="font-medium text-slate-700">
                                      {answer.questionLabel || answer.questionKey}
                                    </p>
                                    <p className="text-slate-600 mt-0.5">
                                      {answer.answerText || (
                                        <span className="italic text-slate-400">No answer provided</span>
                                      )}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Confirmation code is shown beside the card title now */}

                  {(hotelName || comments) && (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm font-semibold text-slate-800 mb-3">Booking Details</p>
                      <div className="space-y-3">
                        {hotelName && <InfoRow label="Hotel / Accommodation" value={hotelName} />}
                        {comments && (
                          <div>
                            <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">
                              Comments
                            </p>
                            <p className="text-sm text-slate-700 whitespace-pre-wrap">{comments}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}

          <div className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-4 flex justify-between items-center">
            <span className="font-semibold text-slate-800">Order Total</span>
            <span className="text-lg font-bold text-slate-900" data-testid="confirmation__total">
              {formatPrice(confirmationData.totalAmount)}
            </span>
          </div>
        </div>

        {/* Bottom print button */}
        <div className="pt-4 text-center print:hidden">
          <button
            type="button"
            onClick={() => handlePrint(null, () => contentToPrint.current)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-slate-800 text-white text-sm font-medium hover:bg-slate-700 transition"
          >
            <FontAwesomeIcon icon={faPrint} />
            Print this confirmation
          </button>
        </div>
      </div>
    </div>
  );
};

export default BookingConfirmation;

