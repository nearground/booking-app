import React, { useEffect, useState } from 'react';
import FinalBookingSummary from './components/final-booking-summary/FinalBookingSummary';
import { useLocation } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { getReadableMonthFormat } from 'utils/date-helpers';
import { useSearchParams } from 'react-router-dom';
import { AuthContext } from 'contexts/AuthContext';
import { useContext } from 'react';
import { networkAdapter } from 'services/NetworkAdapter';
import Loader from 'components/ux/loader/loader';
import Toast from 'components/ux/toast/Toast';

/**
 * Checkout component for processing payments and collecting user information.
 *
 * @returns {JSX.Element} The rendered Checkout component.
 */
const Checkout = () => {
  const [errors, setErrors] = useState({});
  const [attendeeErrors, setAttendeeErrors] = useState([]);

  const location = useLocation();

  const navigate = useNavigate();

  const [searchParams] = useSearchParams();
  const bookingType = searchParams.get('bookingType') === 'experience' ? 'experience' : 'hotel';
  const experienceCode = searchParams.get('experienceCode');

  const [toastMessage, setToastMessage] = useState('');

  const { isAuthenticated, userDetails } = useContext(AuthContext);

  const [isSubmitDisabled, setIsSubmitDisabled] = useState(false);

  const [paymentConfirmationDetails, setPaymentConfirmationDetails] = useState({
    isLoading: false,
    data: {},
  });

  const dismissToast = () => {
    setToastMessage('');
  };

  const bookingContext = location.state?.bookingContext || null;
  const [experienceTierPriceMap, setExperienceTierPriceMap] = useState({});
  const [experienceTierTitleMap, setExperienceTierTitleMap] = useState({});
  const [experienceTierDescriptionMap, setExperienceTierDescriptionMap] = useState({});
  const [experienceUserQuestionnary, setExperienceUserQuestionnary] = useState([]);
  const [reservationQuestionAnswers, setReservationQuestionAnswers] = useState({});

  const [experienceAttendees, setExperienceAttendees] = useState([]);
  const [mainContactIndex, setMainContactIndex] = useState(0);
  const [isBillingLinkedToMainContact, setIsBillingLinkedToMainContact] = useState(false);

  const getTicketSelections = () => {
    if (Array.isArray(bookingContext?.tickets) && bookingContext.tickets.length > 0) {
      return bookingContext.tickets;
    }

    const serializedSelections = searchParams.get('ticketSelections');
    if (!serializedSelections) {
      return [];
    }

    try {
      const parsedSelections = JSON.parse(serializedSelections);
      return Array.isArray(parsedSelections) ? parsedSelections : [];
    } catch (_error) {
      return [];
    }
  };

  const serializedTicketSelections = searchParams.get('ticketSelections') || '';

  useEffect(() => {
    const applyTicketTierMetadata = (tiers = [], userQuestionnary = []) => {
      if (!Array.isArray(tiers)) {
        return;
      }

      const nextPriceMap = {};
      const nextTitleMap = {};
      const nextDescriptionMap = {};

      tiers.forEach((tier) => {
        const tierId = Number(tier.id);
        if (!Number.isInteger(tierId)) {
          return;
        }

        nextPriceMap[tierId] = tier.price;
        nextTitleMap[tierId] = tier.title || 'Ticket';
        nextDescriptionMap[tierId] = tier.description || '';
      });

      setExperienceTierPriceMap(nextPriceMap);
      setExperienceTierTitleMap(nextTitleMap);
      setExperienceTierDescriptionMap(nextDescriptionMap);

      const normalizedQuestionnary = Array.isArray(userQuestionnary)
        ? userQuestionnary
        : [];
      setExperienceUserQuestionnary(normalizedQuestionnary);

      const initialReservationAnswers = normalizedQuestionnary.reduce((accumulator, question) => {
        const questionKey = String(question?.questionKey || '').trim();
        if (!questionKey) {
          return accumulator;
        }

        accumulator[questionKey] = '';
        return accumulator;
      }, {});

      setReservationQuestionAnswers(initialReservationAnswers);
    };

    const fetchExperienceTicketTiers = async () => {
      if (bookingType !== 'experience' || !experienceCode) {
        return;
      }

      const previewTicketTiers = Array.isArray(bookingContext?.previewTicketTiers)
        ? bookingContext.previewTicketTiers
        : [];
      const previewUserQuestionnary = Array.isArray(bookingContext?.previewUserQuestionnary)
        ? bookingContext.previewUserQuestionnary
        : [];

      if (previewTicketTiers.length > 0 || previewUserQuestionnary.length > 0) {
        applyTicketTierMetadata(previewTicketTiers, previewUserQuestionnary);
        return;
      }

      try {
        const response = await networkAdapter.get(`/api/experiences/${experienceCode}`);
        const tiers = response?.data?.TicketTiers;
        const userQuestionnary = Array.isArray(response?.data?.userQuestionnary)
          ? response.data.userQuestionnary
          : [];

        if (!Array.isArray(tiers)) {
          return;
        }

        applyTicketTierMetadata(tiers, userQuestionnary);
      } catch (_error) {
        applyTicketTierMetadata(previewTicketTiers, previewUserQuestionnary);
      }
    };

    fetchExperienceTicketTiers();
  }, [bookingContext, bookingType, experienceCode]);

  useEffect(() => {
    if (bookingType !== 'experience') {
      return;
    }

    const tickets = getTicketSelections();
    const attendees = [];

    tickets.forEach((ticket) => {
      const quantity = Number(ticket.quantity || 0);
      const ticketTierId = Number(ticket.ticketTierId);

      if (!Number.isInteger(ticketTierId) || quantity <= 0) {
        return;
      }

      for (let index = 0; index < quantity; index += 1) {
        attendees.push({
          ticketTierId,
          ticketTitle: ticket.title || 'Ticket',
          firstName: '',
          lastName: '',
          email: formData.email || '',
          allergies: '',
        });
      }
    });

    setExperienceAttendees(attendees);
    setAttendeeErrors(attendees.map(() => ({})));
    setMainContactIndex(0);
    setIsBillingLinkedToMainContact(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingType, bookingContext, serializedTicketSelections]);

  useEffect(() => {
    if (experienceAttendees.length === 0) {
      setMainContactIndex(0);
      return;
    }

    if (mainContactIndex > experienceAttendees.length - 1) {
      setMainContactIndex(0);
    }
  }, [experienceAttendees, mainContactIndex]);

  useEffect(() => {
    if (!isBillingLinkedToMainContact || bookingType !== 'experience') {
      return;
    }

    const mainContact = experienceAttendees[mainContactIndex];
    if (!mainContact) {
      return;
    }

    setFormData((previousFormData) => ({
      ...previousFormData,
      email: mainContact.email || '',
      nameOnCard: `${mainContact.firstName || ''} ${mainContact.lastName || ''}`.trim(),
    }));
  }, [bookingType, experienceAttendees, isBillingLinkedToMainContact, mainContactIndex]);

  const handleAttendeeChange = (attendeeIndex, field, value) => {
    setExperienceAttendees((previousAttendees) =>
      previousAttendees.map((attendee, index) =>
        index === attendeeIndex ? { ...attendee, [field]: value } : attendee
      )
    );

    setAttendeeErrors((previousErrors) =>
      previousErrors.map((attendeeError, index) =>
        index === attendeeIndex ? { ...attendeeError, [field]: false } : attendeeError
      )
    );
  };

  const validateExperienceAttendees = () => {
    const nextErrors = experienceAttendees.map((attendee) => ({
      firstName: !attendee.firstName.trim(),
      lastName: !attendee.lastName.trim(),
      email: !validationSchema.email(attendee.email),
    }));

    setAttendeeErrors(nextErrors);
    return nextErrors.every(
      (attendeeError) =>
        !attendeeError.firstName && !attendeeError.lastName && !attendeeError.email
    );
  };

  const buildExperienceAttendeesPayload = () => {
    return experienceAttendees.map((attendee) => ({
      ticketTierId: attendee.ticketTierId,
      firstName: attendee.firstName.trim(),
      lastName: attendee.lastName.trim(),
      email: attendee.email.trim(),
      allergies: attendee.allergies.trim() || null,
      customAnswers: attendee.allergies.trim()
        ? { allergies: attendee.allergies.trim() }
        : undefined,
    }));
  };

  const handleReservationQuestionAnswerChange = (questionKey, value) => {
    setReservationQuestionAnswers((previousAnswers) => ({
      ...previousAnswers,
      [questionKey]: value,
    }));
  };

  const validateReservationQuestions = () => {
    return experienceUserQuestionnary.every((question) => {
      if (!question?.required) {
        return true;
      }

      const questionKey = String(question?.questionKey || '').trim();
      if (!questionKey) {
        return true;
      }

      return Boolean(String(reservationQuestionAnswers[questionKey] || '').trim());
    });
  };

  const buildReservationAnswersPayload = () => {
    return experienceUserQuestionnary.reduce((accumulator, question) => {
      const questionKey = String(question?.questionKey || '').trim();
      if (!questionKey) {
        return accumulator;
      }

      const answerText = String(reservationQuestionAnswers[questionKey] || '').trim();
      if (!answerText) {
        return accumulator;
      }

      accumulator[questionKey] = answerText;
      return accumulator;
    }, {});
  };

  const parseCheckoutTotal = (rawTotal) => {
    const normalized = String(rawTotal || '').replace(/[^\d.-]/g, '');
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const parseMoneyValue = (value) => {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    const normalized = String(value ?? '').replace(/[^\d.-]/g, '');
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const selectedExperienceTickets = getTicketSelections();

  const experienceTicketLineItems = Array.isArray(selectedExperienceTickets)
    ? selectedExperienceTickets.map((ticket) => {
        const quantity = Number(ticket.quantity || 0);
        const ticketTierId = Number(ticket.ticketTierId);
        const unitPrice = parseMoneyValue(
          ticket.unitPrice ??
            ticket.price ??
            (Number.isInteger(ticketTierId) ? experienceTierPriceMap[ticketTierId] : null)
        );
        const subtotal =
          parseMoneyValue(ticket.subtotal ?? ticket.total) ??
          (unitPrice !== null ? unitPrice * quantity : null);

        return {
          ...ticket,
          title:
            ticket.title ||
            (Number.isInteger(ticketTierId) ? experienceTierTitleMap[ticketTierId] : null) ||
            'Ticket',
          description:
            ticket.description ||
            (Number.isInteger(ticketTierId)
              ? experienceTierDescriptionMap[ticketTierId]
              : null) ||
            '',
          quantity,
          unitPrice,
          subtotal,
        };
      })
    : [];

  const computedExperienceTotal = experienceTicketLineItems.reduce(
    (sum, ticket) => sum + (ticket.subtotal || 0),
    0
  );

  const checkoutTotalAmount =
    bookingType === 'experience'
      ? computedExperienceTotal || parseCheckoutTotal(location.state?.total)
      : parseCheckoutTotal(location.state?.total);

  // Form state for collecting user payment and address information
  const [formData, setFormData] = useState({
    email: userDetails?.email ? userDetails?.email : '',
    nameOnCard: '',
    cardNumber: '',
    expiry: '',
    cvc: '',
    address: '',
    city: '',
    state: '',
    postalCode: '',
  });

  // Format the check-in and check-out date and time
  const checkInDateTime = `${getReadableMonthFormat(
    searchParams.get('checkIn')
  )}, ${location.state?.checkInTime}`;
  const checkOutDateTime = `${getReadableMonthFormat(
    searchParams.get('checkOut')
  )}, ${location.state?.checkOutTime}`;

  const experienceStartDateTime = bookingContext?.sessionDateTime
    ? new Date(bookingContext.sessionDateTime).toLocaleString([], {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : '';

  const experienceEndDateTime =
    bookingContext?.sessionDateTime && bookingContext?.experienceDurationMinutes
      ? new Date(
          new Date(bookingContext.sessionDateTime).getTime() +
            Number(bookingContext.experienceDurationMinutes || 0) * 60000
        ).toLocaleString([], {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        })
      : '';

  useEffect(() => {
    const locationState = location.state;

    if (bookingType === 'experience') {
      const experienceCode = searchParams.get('experienceCode');
      if (!locationState || !bookingContext || !bookingContext.sessionDateTime) {
        if (experienceCode) {
          navigate(`/experience/${experienceCode}`);
        } else {
          navigate('/experiences');
        }
      }
      return;
    }

    const checkIn = searchParams.get('checkIn');
    const checkOut = searchParams.get('checkOut');
    if (!locationState || !checkIn || !checkOut) {
      const hotelCode = searchParams.get('hotelCode');
      navigate(`/hotel/${hotelCode}`);
    }
  }, [
    bookingContext,
    bookingType,
    location,
    navigate,
    searchParams,
  ]);

  /**
   * Handle form input changes and validate the input.
   * @param {React.ChangeEvent<HTMLInputElement>} e The input change event.
   */
  const formatCardNumber = (value) => {
    const digits = String(value).replace(/\D/g, '').slice(0, 16);
    return digits.replace(/(.{4})/g, '$1 ').trim();
  };

  const formatExpiry = (value) => {
    const digits = String(value).replace(/\D/g, '').slice(0, 4);
    if (digits.length <= 2) {
      return digits;
    }
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    let nextValue = value;

    if (name === 'cardNumber') {
      nextValue = formatCardNumber(value);
    }
    if (name === 'expiry') {
      nextValue = formatExpiry(value);
    }

    const isValid = validationSchema[name](nextValue);
    setFormData({ ...formData, [name]: nextValue });
    setErrors({ ...errors, [name]: !isValid });
  };

  /**
   * Handle form submission and validate the form.
   * @param {React.FormEvent<HTMLFormElement>} e The form submission event.
   * @returns {void}
   * @todo Implement form submission logic.
   * @todo Implement form validation logic.
   * @todo Implement form submission error handling.
   * @todo Implement form submission success handling.
   * @todo Implement form submission loading state.
   * @todo Implement form submission error state.
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    let isValid = true;
    const newErrors = {};

    Object.keys(formData).forEach((field) => {
      const isFieldValid = validationSchema[field](formData[field]);
      newErrors[field] = !isFieldValid;
      isValid = isValid && isFieldValid;
    });

    setErrors(newErrors);

    const isAttendeesValid = bookingType === 'experience' ? validateExperienceAttendees() : true;
    const areReservationQuestionsValid =
      bookingType === 'experience' ? validateReservationQuestions() : true;

    if (!isAttendeesValid) {
      setToastMessage('Please complete attendee details for all tickets.');
    }

    if (!areReservationQuestionsValid) {
      setToastMessage('Please complete all required reservation questions.');
    }

    if (!isValid || !isAttendeesValid || !areReservationQuestionsValid) {
      return;
    }

    setIsSubmitDisabled(true);
    setPaymentConfirmationDetails({
      isLoading: true,
      data: {},
    });

    let reservationData = null;

    if (bookingType === 'experience') {
      const experienceCode = searchParams.get('experienceCode');
      const scheduledExperienceId = Number(searchParams.get('scheduledExperienceId'));
      const attendees = buildExperienceAttendeesPayload();

      if (!experienceCode || !Number.isInteger(scheduledExperienceId) || attendees.length === 0) {
        setToastMessage('Unable to create experience reservation. Please try selecting tickets again.');
        setIsSubmitDisabled(false);
        setPaymentConfirmationDetails({
          isLoading: false,
          data: {},
        });
        return;
      }

      const reservationPayload = {
        scheduledExperienceId,
        attendees,
        mainContactIndex,
        billingLinkedToMainContact: isBillingLinkedToMainContact,
        billing: {
          email: formData.email,
          name: formData.nameOnCard,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          postalCode: formData.postalCode,
        },
        totalPrice: parseCheckoutTotal(location.state?.total),
        customReservationAnswers: buildReservationAnswersPayload(),
      };

      const reservationResponse = await networkAdapter.post(
        `/api/experiences/${experienceCode}/reservations`,
        reservationPayload
      );

      if (
        !reservationResponse ||
        !reservationResponse.data ||
        (Array.isArray(reservationResponse.errors) && reservationResponse.errors.length > 0)
      ) {
        setToastMessage(
          reservationResponse?.errors?.[0] ||
            'Unable to reserve experience tickets. Please try again.'
        );
        setIsSubmitDisabled(false);
        setPaymentConfirmationDetails({
          isLoading: false,
          data: {},
        });
        return;
      }

      reservationData = reservationResponse.data;
    }

    const response = await networkAdapter.post(
      '/api/payments/confirmation',
      {
        ...formData,
        bookingType,
        reservationId: reservationData?.reservationId,
        reservationCode: reservationData?.confirmationCode,
      }
    );
    if (response && response.data && response.errors.length === 0) {
      setPaymentConfirmationDetails({
        isLoading: false,
        data: response.data,
      });

      const reservationContactInfo = {
        fullName:
          experienceAttendees.length > 0
            ? `${experienceAttendees[mainContactIndex]?.firstName || ''} ${experienceAttendees[mainContactIndex]?.lastName || ''}`.trim() || userDetails?.fullName || ''
            : userDetails?.fullName || '',
        email:
          experienceAttendees.length > 0
            ? experienceAttendees[mainContactIndex]?.email || userDetails?.email || ''
            : userDetails?.email || '',
        phone:
          experienceAttendees.length > 0
            ? experienceAttendees[mainContactIndex]?.phone || userDetails?.phone || ''
            : userDetails?.phone || '',
      };

      const paymentMethodLabel = formData.cardNumber
        ? `Card •••• ${formData.cardNumber.replace(/\s/g, '').slice(-4)}`
        : undefined;

      const confirmationData = {
        ...response.data,
        paymentMethod: paymentMethodLabel,
        contactInfo: reservationContactInfo,
        questionAnswers: reservationQuestionAnswers,
        meetingAddress: bookingContext?.meetingAddress || bookingContext?.meeting_location || location.state?.meetingAddress || location.state?.meeting_location || null,
      };

      if (bookingType === 'experience' && reservationData) {
        const formattedBookingDate = reservationData.bookingDate
          ? new Date(reservationData.bookingDate).toLocaleString()
          : new Date().toLocaleString();

        const ticketBreakdownDetails = Array.isArray(reservationData.ticketBreakdown)
          ? reservationData.ticketBreakdown.map((ticket) => ({
              label: `${ticket.tierTitle} (${ticket.quantity} x $${Number(ticket.unitPrice || 0).toFixed(2)})`,
              value: `$${Number(ticket.amount || 0).toFixed(2)}`,
            }))
          : [];

        confirmationData.bookingDetails = [
          { label: 'Reservation Code', value: reservationData.confirmationCode },
          { label: 'Number of Attendees', value: String(reservationData.numberOfAttendees) },
          { label: 'Booking Date', value: formattedBookingDate },
          {
            label: 'Experience Name',
            value: reservationData.experienceName || searchParams.get('experienceName') || 'Experience',
          },
          ...ticketBreakdownDetails,
          { label: 'Total Price', value: `$${Number(reservationData.totalPrice || 0).toFixed(2)}` },
        ];
      }

      const bookingName =
        bookingType === 'experience'
          ? (searchParams.get('experienceName') || 'experience').replaceAll(' ', '_')
          : searchParams.get('hotelName').replaceAll('-', '_');
      navigate(`/booking-confirmation?payment=sucess&booking=${bookingName}`, {
        state: {
          confirmationData,
        },
      });
    } else {
      setToastMessage('Payment failed. Please try again.');
      setIsSubmitDisabled(false);
      setPaymentConfirmationDetails({
        isLoading: false,
        data: {},
      });
    }
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <div className="relative bg-white border shadow-md rounded px-8 pt-6 pb-8 mb-4 w-full">
          {paymentConfirmationDetails.isLoading && (
            <Loader
              isFullScreen={true}
              loaderText={'Payment in progress, hold tight!'}
            />
          )}
          <form
            onSubmit={handleSubmit}
            noValidate
            className={` ${
              paymentConfirmationDetails.isLoading ? 'opacity-40' : ''
            }`}
          >
          {bookingType === 'experience' && experienceAttendees.length > 0 && (
            <div className="mb-6 border border-gray-200 rounded p-4">
              <h4 className="text-lg font-semibold text-gray-800 mb-2">
                Attendee details
              </h4>
              <p className="text-sm text-gray-600 mb-4">
                Please provide details for each ticket holder.
              </p>

              {experienceAttendees.map((attendee, attendeeIndex) => (
                <div
                  key={`${attendee.ticketTierId}-${attendeeIndex}`}
                  className="border border-gray-100 rounded p-3 mb-3"
                >
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium text-gray-700">
                      Ticket {attendeeIndex + 1}: {attendee.ticketTitle}
                    </p>
                    {mainContactIndex === attendeeIndex ? (
                      <span className="text-xs font-semibold text-brand">Main Contact</span>
                    ) : (
                      <button
                        type="button"
                        className="text-xs font-medium text-brand hover:underline"
                        onClick={() => setMainContactIndex(attendeeIndex)}
                      >
                        Set as Main Contact
                      </button>
                    )}
                  </div>
                  <InputField
                    label="First name"
                    type="text"
                    name={`attendee-first-${attendeeIndex}`}
                    value={attendee.firstName}
                    onChange={(event) =>
                      handleAttendeeChange(attendeeIndex, 'firstName', event.target.value)
                    }
                    placeholder="First name"
                    required={true}
                    error={attendeeErrors[attendeeIndex]?.firstName}
                  />
                  <InputField
                    label="Last name"
                    type="text"
                    name={`attendee-last-${attendeeIndex}`}
                    value={attendee.lastName}
                    onChange={(event) =>
                      handleAttendeeChange(attendeeIndex, 'lastName', event.target.value)
                    }
                    placeholder="Last name"
                    required={true}
                    error={attendeeErrors[attendeeIndex]?.lastName}
                  />
                  <InputField
                    label="Email"
                    type="email"
                    name={`attendee-email-${attendeeIndex}`}
                    value={attendee.email}
                    onChange={(event) =>
                      handleAttendeeChange(attendeeIndex, 'email', event.target.value)
                    }
                    placeholder="Email"
                    required={true}
                    error={attendeeErrors[attendeeIndex]?.email}
                  />
                  <InputField
                    label="Allergies (optional)"
                    type="text"
                    name={`attendee-allergies-${attendeeIndex}`}
                    value={attendee.allergies}
                    onChange={(event) =>
                      handleAttendeeChange(attendeeIndex, 'allergies', event.target.value)
                    }
                    placeholder="e.g. peanuts, shellfish"
                    required={false}
                    error={false}
                  />
                </div>
              ))}
            </div>
          )}

          {bookingType === 'experience' && experienceUserQuestionnary.length > 0 && (
            <div className="mb-6 border border-gray-200 rounded p-4">

              {experienceUserQuestionnary.map((question, questionIndex) => {
                const questionKey = String(question?.questionKey || '').trim();
                if (!questionKey) {
                  return null;
                }

                return (
                  <InputField
                    key={`${questionKey}-${questionIndex}`}
                    label={question.prompt || `Question ${questionIndex + 1}`}
                    type="text"
                    name={`reservation-question-${questionKey}`}
                    value={reservationQuestionAnswers[questionKey] || ''}
                    onChange={(event) =>
                      handleReservationQuestionAnswerChange(questionKey, event.target.value)
                    }
                    placeholder="Your answer"
                    required={Boolean(question.required)}
                    error={
                      Boolean(question.required) &&
                      !String(reservationQuestionAnswers[questionKey] || '').trim()
                    }
                  />
                );
              })}
            </div>
          )}

            <div className="mb-4">
              <h4 className="text-lg font-bold text-gray-800">Billing Section</h4>
            </div>

            {bookingType === 'experience' && experienceAttendees.length > 0 && (
              <label className="flex items-center gap-2 text-sm text-gray-700 mb-3">
                <input
                  type="checkbox"
                  checked={isBillingLinkedToMainContact}
                  onChange={(event) => setIsBillingLinkedToMainContact(event.target.checked)}
                />
                Use Main Contact info for billing email and card name
              </label>
            )}

            <InputField
              label="Email address"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Email"
              required={true}
              error={errors.email}
              disabled={bookingType === 'experience' && isBillingLinkedToMainContact}
            />

          <div className="mb-4 mt-6">
            <h4 className="text-lg font-bold text-gray-800">Payment Details</h4>
          </div>

          <InputField
            label="Name on card"
            type="text"
            name="nameOnCard"
            value={formData.nameOnCard}
            onChange={handleChange}
            placeholder="Name as it appears on card"
            required={true}
            error={errors.nameOnCard}
            disabled={bookingType === 'experience' && isBillingLinkedToMainContact}
          />
          <InputField
            label="Card number"
            type="text"
            name="cardNumber"
            value={formData.cardNumber}
            onChange={handleChange}
            placeholder="0000 0000 0000 0000"
            required={true}
            error={errors.cardNumber}
          />
          <div className="flex mb-4 justify-between">
            <InputField
              label="Expiration date (MM/YY)"
              type="text"
              name="expiry"
              value={formData.expiry}
              onChange={handleChange}
              placeholder="MM/YY"
              required={true}
              error={errors.expiry}
            />
            <InputField
              label="CVC"
              type="text"
              name="cvc"
              value={formData.cvc}
              onChange={handleChange}
              placeholder="CVC"
              required={true}
              error={errors.cvc}
            />
          </div>
          <InputField
            label="Address"
            type="text"
            name="address"
            value={formData.address}
            onChange={handleChange}
            placeholder="Street Address"
            required={true}
            error={errors.address}
          />
          <InputField
            label="City"
            type="text"
            name="city"
            value={formData.city}
            onChange={handleChange}
            placeholder="City"
            required={true}
            error={errors.city}
          />
          <div className="flex mb-4 justify-between">
            <InputField
              label="State / Province"
              type="text"
              name="state"
              value={formData.state}
              onChange={handleChange}
              placeholder="State"
              required={true}
              error={errors.state}
            />
            <InputField
              label="Postal code"
              type="text"
              name="postalCode"
              value={formData.postalCode}
              onChange={handleChange}
              placeholder="Postal Code"
              required={true}
              error={errors.postalCode}
            />
          </div>
            <div className="flex items-center justify-between">
              <button
                className={`bg-brand hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full transition duration-300 ${
                  isSubmitDisabled
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:bg-emerald-700'
                }`}
                type="submit"
                disabled={isSubmitDisabled}
              >
                Pay {location.state?.total}
              </button>
            </div>
          </form>

          {toastMessage && (
            <div className="my-4">
              <Toast
                message={toastMessage}
                type={'error'}
                dismissError={dismissToast}
              />
            </div>
          )}
        </div>

        <div className="w-full">
          <FinalBookingSummary
            hotelName={
              bookingType === 'experience'
                ? searchParams.get('experienceName') || bookingContext?.experienceTitle || 'Experience'
                : searchParams.get('hotelName').replaceAll('-', ' ')
            }
            checkIn={bookingType === 'experience' ? experienceStartDateTime : checkInDateTime}
            checkOut={bookingType === 'experience' ? experienceEndDateTime : checkOutDateTime}
            middleInfoText={
              bookingType === 'experience'
                ? `${bookingContext?.totalTickets || searchParams.get('tickets') || 0} Tickets`
                : undefined
            }
            startLabel={bookingType === 'experience' ? 'Starts' : 'Check-in'}
            endLabel={bookingType === 'experience' ? 'Ends' : 'Check-out'}
            isAuthenticated={isAuthenticated}
            phone={ experienceAttendees.length > 0
                ? experienceAttendees[mainContactIndex]?.phone || userDetails?.phone || ''
                : userDetails?.phone || ''
            }
            email={ experienceAttendees.length > 0
                ? experienceAttendees[mainContactIndex]?.email || userDetails?.email || ''
                : userDetails?.email || ''
            }
            fullName={ experienceAttendees.length > 0
                ? `${experienceAttendees[mainContactIndex]?.firstName || ''} ${experienceAttendees[mainContactIndex]?.lastName || ''}`.trim() || userDetails?.fullName || ''
                : userDetails?.fullName || ''
            }
          />

          <div className="bg-white border-gray-200 border rounded-lg p-6 shadow w-full max-w-lg mx-auto">
            <h4 className="text-xl font-bold text-gray-800 mb-4">Cost summary</h4>

            {bookingType === 'experience' && experienceTicketLineItems.length > 0 ? (
              <div className="space-y-3 mb-4">
                {experienceTicketLineItems.map((ticket, index) => (
                  <div
                    key={`${ticket.ticketTierId || ticket.title}-${index}`}
                    className="flex justify-between items-start"
                  >
                    <div>
                      <p className="text-sm font-semibold text-gray-700">{ticket.title}</p>
                      {ticket.description && (
                        <p className="text-xs text-gray-500">{ticket.description}</p>
                      )}
                      <p className="text-xs text-gray-500">
                        {ticket.quantity} x {ticket.unitPrice !== null ? `$${ticket.unitPrice.toFixed(2)}` : 'N/A'}
                      </p>
                    </div>
                    <p className="text-sm text-gray-800 font-medium">
                      {ticket.subtotal !== null ? `$${ticket.subtotal.toFixed(2)}` : 'N/A'}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-600 mb-4">Pricing details will be shown here.</p>
            )}

            <div className="border-t border-gray-200 pt-4 flex items-center justify-between">
              <p className="text-base font-semibold text-gray-800">Total</p>
              <p className="text-lg font-bold text-gray-900">
                ${checkoutTotalAmount.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Generic Input field component for collecting user information.
 * @param {Object} props The component props.
 * @param {string} props.label The input field label.
 * @param {string} props.type The input field type.
 * @param {string} props.name The input field name.
 * @param {string} props.value The input field value.
 * @param {Function} props.onChange The input field change handler.
 * @param {string} props.placeholder The input field placeholder.
 * @param {boolean} props.required The input field required status.
 * @param {boolean} props.error The input field error status.
 *
 * @returns {JSX.Element} The rendered InputField component.
 */
const InputField = ({
  label,
  type,
  name,
  value,
  onChange,
  placeholder,
  required,
  error,
  disabled = false,
}) => (
  <div className="mb-4">
    <label
      className="block text-gray-700 text-sm font-bold mb-2"
      htmlFor={name}
    >
      {label}
      {error && <span className="text-red-500 ml-1">*</span>}
    </label>
    <input
      className={`shadow appearance-none border ${
        error ? 'border-red-500' : 'border-gray-300'
      } rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${
        disabled ? 'bg-gray-100 cursor-not-allowed' : ''
      }`}
      id={name}
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      required={required}
      disabled={disabled}
      aria-invalid={error ? 'true' : 'false'}
    />
    {error && (
      <p className="text-red-500 text-xs my-1">Please check this field.</p>
    )}
  </div>
);

// Validation schema for form fields
const validationSchema = {
  email: (value) => /\S+@\S+\.\S+/.test(value),
  nameOnCard: (value) => value.trim() !== '',
  cardNumber: (value) => /^\d{16}$/.test(String(value).replace(/\D/g, '')), // Simplistic validation: just check if it has 16 digits.
  expiry: (value) => /^(0[1-9]|1[0-2])\/\d{2}$/.test(value), // MM/YY format
  cvc: (value) => /^\d{3,4}$/.test(value), // 3 or 4 digits
  address: (value) => value.trim() !== '',
  city: (value) => value.trim() !== '',
  state: (value) => value.trim() !== '',
  postalCode: (value) => /^\d{5}(-\d{4})?$/.test(value),
};

export default Checkout;
