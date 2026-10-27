import React, { useContext, useEffect, useMemo, useState } from 'react';
import TicketTierSelector from './TicketTierSelector';
import SessionSummary from './SessionSummary';
import WaitlistSection from './WaitlistSection';
import QuestionnaireSection from './QuestionnaireSection';
import MainContactForm from './MainContactForm';
import { CartContext } from '../../contexts/CartContext';
import { AuthContext } from '../../contexts/AuthContext';

const formatDateTime = (dateTime) => {
  const date = new Date(dateTime);
  return date.toLocaleString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const formatTierAgeLabel = (minAgeValue, maxAgeValue) => {
  const hasMinAgeValue = minAgeValue !== null && minAgeValue !== undefined && minAgeValue !== '';
  const hasMaxAgeValue = maxAgeValue !== null && maxAgeValue !== undefined && maxAgeValue !== '';

  const minAge = hasMinAgeValue ? Number(minAgeValue) : null;
  const maxAge = hasMaxAgeValue ? Number(maxAgeValue) : null;

  const hasMinAge = Number.isFinite(minAge);
  const hasMaxAge = Number.isFinite(maxAge);

  if (hasMinAge && hasMaxAge) return `Ages ${minAge} to ${maxAge}`;
  if (hasMinAge) return `Ages ${minAge}+`;
  if (hasMaxAge) return `Ages up to ${maxAge}`;
  return '';
};

const parsePriceValue = (priceValue) => {
  if (typeof priceValue === 'number' && Number.isFinite(priceValue)) return priceValue;
  const normalized = String(priceValue ?? '').replace(/[^\d.-]/g, '');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

const ExperienceSessionBookingModal = ({
  isOpen,
  onClose,
  session,
  experienceCode,
  experienceTitle,
  experienceSubtitle,
  experienceDurationMinutes = 0,
  experienceThumbnail = '',
  ticketTiers = [],
  experienceUserQuestionnary = [],
  isPreview = false,
  initialCartEdit = null,
  experienceLocation = null,
}) => {
  const { addToCart, updateCartItem, openCart } = useContext(CartContext);
  const { isAuthenticated, userDetails } = useContext(AuthContext);
  const [tierQuantities, setTierQuantities] = useState({});
  const [waitlistJoined, setWaitlistJoined] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Questionnaire answers: experience-level
  const [reservationAnswers, setReservationAnswers] = useState({});
  // Questionnaire answers: per-tier (keyed by tier key)
  const [tierAnswers, setTierAnswers] = useState({});

  // Main contact (day-of phone only; full name/email are collected at checkout)
  const [mainContact, setMainContact] = useState({ phone: '', hotelName: '', comments: '' });
  const [mainContactErrors, setMainContactErrors] = useState({});

  const normalizedTiers = useMemo(
    () =>
      (ticketTiers || []).map((tier) => ({
        key: String(tier.id),
        id: tier.id,
        title: tier.title || 'Tier',
        description: tier.description || '',
        ageLabel: formatTierAgeLabel(tier.minAge, tier.maxAge),
        price: parsePriceValue(tier.price),
        userQuestionnary: Array.isArray(tier.userQuestionnary) ? tier.userQuestionnary : [],
      })),
    [ticketTiers]
  );

  const initialTicketQuantities = useMemo(() => {
    if (!initialCartEdit?.metadata?.ticketSelections) {
      return {};
    }

    return (initialCartEdit.metadata.ticketSelections || []).reduce((acc, selection) => {
      const tierId = String(selection.ticketTierId);
      if (tierId) {
        acc[tierId] = Number(selection.quantity) || 0;
      }
      return acc;
    }, {});
  }, [initialCartEdit]);

  const initialMainContact = useMemo(() => {
    if (!initialCartEdit?.metadata?.mainContact) {
      return null;
    }

    return {
      phone: initialCartEdit.metadata.mainContact.phone || '',
      hotelName: initialCartEdit.metadata.hotelName || '',
      comments: initialCartEdit.metadata.comments || '',
    };
  }, [initialCartEdit]);

  const initialReservationAnswers = useMemo(() => {
    return initialCartEdit?.metadata?.reservationAnswers || {};
  }, [initialCartEdit]);

  const initialTierAnswers = useMemo(() => {
    return initialCartEdit?.metadata?.questionnaireAnswers || {};
  }, [initialCartEdit]);

  const editingCartItemId = initialCartEdit?.id || null;

  useEffect(() => {
    if (!isOpen) return;

    const initialQuantities = normalizedTiers.reduce((acc, tier) => {
      acc[tier.key] = initialTicketQuantities[tier.key] ?? 0;
      return acc;
    }, {});

    setTierQuantities(initialQuantities);
    setWaitlistJoined(false);
    setReservationAnswers(initialReservationAnswers);
    setTierAnswers(initialTierAnswers);
    setMainContact({
      phone: initialMainContact?.phone || userDetails?.phoneNumber || '',
      hotelName: initialMainContact?.hotelName || '',
      comments: initialMainContact?.comments || '',
    });
    setMainContactErrors({});
    setErrorMessage('');
    setIsAddingToCart(false);
  }, [
    isOpen,
    normalizedTiers,
    session?.id,
    initialTicketQuantities,
    initialMainContact,
    initialReservationAnswers,
    initialTierAnswers,
    isAuthenticated,
    userDetails,
  ]);

  if (!isOpen || !session) return null;

  const startDate = new Date(session.dateTime);
  const endDate = new Date(startDate.getTime() + Number(experienceDurationMinutes || 0) * 60000);
  const availableSpots = Math.max(0, Number(session.availableSpots || 0));
  const isSessionFull = availableSpots === 0;

  const totalSelectedTickets = normalizedTiers.reduce((acc, tier) => {
    return acc + Number(tierQuantities[tier.key] || 0);
  }, 0);

  const remainingSpots = Math.max(0, availableSpots - totalSelectedTickets);

  const totalPrice = normalizedTiers.reduce((acc, tier) => {
    return acc + Number(tierQuantities[tier.key] || 0) * tier.price;
  }, 0);

  // Collect per-tier questions that are active (tier has tickets selected)
  const activeTierQuestions = normalizedTiers
    .filter((tier) => Number(tierQuantities[tier.key] || 0) > 0 && tier.userQuestionnary.length > 0)
    .map((tier) => ({
      tierKey: tier.key,
      tierTitle: tier.title,
      questions: tier.userQuestionnary,
    }));

  const handleReservationAnswerChange = (questionKey, value) => {
    setReservationAnswers((prev) => ({ ...prev, [questionKey]: value }));
  };

  const handleTierAnswerChange = (tierKey, questionKey, value) => {
    setTierAnswers((prev) => ({
      ...prev,
      [tierKey]: { ...(prev[tierKey] || {}), [questionKey]: value },
    }));
  };

  const handleMainContactChange = (field, value) => {
    setMainContact((prev) => ({ ...prev, [field]: value }));
    if (mainContactErrors[field]) {
      setMainContactErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const validateBeforeAddToCart = () => {
    let valid = true;
    const errors = {};

    if (!mainContact.phone.trim()) {
      errors.phone = 'Phone number is required';
      valid = false;
    }

    setMainContactErrors(errors);

    // Validate required questionnaire answers
    const allExperienceQuestions = experienceUserQuestionnary || [];
    for (const q of allExperienceQuestions) {
      if (q.required && !reservationAnswers[q.questionKey]?.trim()) {
        valid = false;
        setErrorMessage('Please complete all required questions.');
        return false;
      }
    }

    for (const { tierKey, questions } of activeTierQuestions) {
      for (const q of questions) {
        if (q.required) {
          const answer = tierAnswers[tierKey]?.[q.questionKey];
          if (!answer || (typeof answer === 'string' && !answer.trim())) {
            valid = false;
            setErrorMessage('Please complete all required questions.');
            return false;
          }
        }
      }
    }

    if (!valid) return false;
    setErrorMessage('');
    return true;
  };

  const handleAddToCart = async () => {
    if (totalSelectedTickets === 0 || totalSelectedTickets > availableSpots) return;
    if (!validateBeforeAddToCart()) return;

    setIsAddingToCart(true);
    setErrorMessage('');

    const selectedTickets = normalizedTiers
      .map((tier) => ({
        ticketTierId: tier.id,
        title: tier.title,
        description: tier.description,
        quantity: Number(tierQuantities[tier.key] || 0),
        unitPrice: tier.price,
      }))
      .filter((t) => t.quantity > 0);

    const totalQuantity = selectedTickets.reduce((sum, t) => sum + t.quantity, 0);

    const cartItemPayload = {
      ProductType: 'Experience',
      ProductId: Number(experienceCode) || null,
      description: experienceTitle || 'Experience',
      unitPrice: totalPrice / totalQuantity,
      quantity: totalQuantity,
      metadata: {
        ScheduledExperienceId: session.id,
        experienceCode: String(experienceCode || ''),
        experienceTitle: experienceTitle || 'Experience',
        experienceThumbnail: experienceThumbnail || '',
        sessionDateTime: session.dateTime,
        experienceDurationMinutes,
        ticketSelections: selectedTickets,
        numberOfAttendees: totalQuantity,
        reservationAnswers: (experienceUserQuestionnary || [])
          .filter((q) => reservationAnswers[q.questionKey] !== undefined && String(reservationAnswers[q.questionKey]).trim() !== '')
          .map((q) => ({
            questionKey: q.questionKey,
            questionLabel: q.prompt || q.questionKey,
            answerText: String(reservationAnswers[q.questionKey] || ''),
          })),
        questionnaireAnswers: normalizedTiers
          .filter((tier) => Number(tierQuantities[tier.key] || 0) > 0 && tierAnswers[tier.key])
          .flatMap((tier) =>
            (tier.userQuestionnary || [])
              .filter((q) => tierAnswers[tier.key]?.[q.questionKey] !== undefined)
              .map((q) => ({
                tierKey: tier.key,
                tierTitle: tier.title,
                questionKey: q.questionKey,
                questionLabel: q.prompt || q.questionKey,
                answerText: String(tierAnswers[tier.key][q.questionKey] || ''),
              }))
          ),
        mainContact: {
          phone: mainContact.phone.trim(),
        },
        hotelName: mainContact.hotelName.trim() || null,
        comments: mainContact.comments.trim() || null,
        meetingAddress: experienceLocation
          ? [experienceLocation.name, experienceLocation.street, experienceLocation.city,
             experienceLocation.state ? `${experienceLocation.state} ${experienceLocation.zipCode || ''}`.trim() : experienceLocation.zipCode,
             experienceLocation.country]
              .filter(Boolean)
              .join(', ')
          : null,
      },
    };

    try {
      if (editingCartItemId) {
        await updateCartItem(editingCartItemId, {
          quantity: totalQuantity,
          metadata: cartItemPayload.metadata,
        });
      } else {
        await addToCart(cartItemPayload);
      }
      setIsAddingToCart(false);
      onClose();
      openCart();
    } catch {
      setErrorMessage(editingCartItemId ? 'Failed to update cart item. Please try again.' : 'Failed to add to cart. Please try again.');
      setIsAddingToCart(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div
        className="bg-white w-full max-w-4xl max-h-[90vh] rounded-xl shadow-lg border border-slate-200 p-5 overflow-y-auto"
        data-testid="booking-modal"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h3 className="text-xl font-semibold text-slate-800" data-testid="booking-modal__title">
              {experienceTitle || 'Experience'}
            </h3>
            <p className="text-sm text-slate-600 mt-1">{experienceSubtitle || 'Session details'}</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="text-right">
              <p className="text-sm font-medium text-slate-700">Start: {formatDateTime(startDate)}</p>
              <p className="text-sm text-slate-600 mt-1">End: {formatDateTime(endDate)}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-500 hover:text-slate-700 text-2xl leading-none"
              aria-label="Close booking modal"
            >
              &times;
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-5">
          {/* Left column: Tickets + Questionnaire + Contact */}
          <div className="md:col-span-2 space-y-3">
            {isSessionFull ? (
              <WaitlistSection />
            ) : (
              <>
                {/* Ticket tier selectors */}
                {normalizedTiers.map((tier) => {
                  const currentQty = Number(tierQuantities[tier.key] || 0);
                  const maxSelectable = Math.max(0, currentQty + remainingSpots);
                  return (
                    <TicketTierSelector
                      key={tier.key}
                      tier={tier}
                      quantity={currentQty}
                      canDecrement={currentQty > 0}
                      canIncrement={currentQty < maxSelectable}
                      onDecrement={() =>
                        setTierQuantities((prev) => ({
                          ...prev,
                          [tier.key]: Math.max(0, currentQty - 1),
                        }))
                      }
                      onIncrement={() =>
                        setTierQuantities((prev) => ({
                          ...prev,
                          [tier.key]: Math.min(maxSelectable, currentQty + 1),
                        }))
                      }
                    />
                  );
                })}

                {/* Per-tier questionnaire sections (shown when tier has tickets) */}
                {activeTierQuestions.map(({ tierKey, tierTitle, questions }) => (
                  <QuestionnaireSection
                    key={tierKey}
                    title={`${tierTitle} — Questions`}
                    questions={questions}
                    answers={tierAnswers[tierKey] || {}}
                    onChange={(qKey, value) => handleTierAnswerChange(tierKey, qKey, value)}
                  />
                ))}

                {/* Experience-level questionnaire */}
                {totalSelectedTickets > 0 && (experienceUserQuestionnary || []).length > 0 ? (
                  <QuestionnaireSection
                    title="Reservation Questions"
                    questions={experienceUserQuestionnary}
                    answers={reservationAnswers}
                    onChange={handleReservationAnswerChange}
                  />
                ) : null}

                {/* Main contact form (shown when tickets selected) */}
                {totalSelectedTickets > 0 ? (
                  <MainContactForm
                    mainContact={mainContact}
                    onChange={handleMainContactChange}
                    errors={mainContactErrors}
                  />
                ) : null}

              </>
            )}

            {/* Error message */}
            {errorMessage ? (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2" data-testid="booking-modal__error">
                {errorMessage}
              </p>
            ) : null}
          </div>

          {/* Right column: Summary */}
          <SessionSummary
            isSessionFull={isSessionFull}
            remainingSpots={remainingSpots}
            totalPrice={totalPrice}
            totalSelectedTickets={totalSelectedTickets}
            availableSpots={availableSpots}
            onAddToCart={handleAddToCart}
            waitlistJoined={waitlistJoined}
            onJoinWaitlist={() => setWaitlistJoined(true)}
            isAddingToCart={isAddingToCart}
          />
        </div>
      </div>
    </div>
  );
};

export default ExperienceSessionBookingModal;
