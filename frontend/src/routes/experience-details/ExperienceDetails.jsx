import React, {
  useEffect,
  useState,
  useRef,
  useMemo,
  useCallback,
  lazy,
  Suspense,
  useContext,
} from 'react';
import { AuthContext } from 'contexts/AuthContext';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faStar } from '@fortawesome/free-solid-svg-icons';
import { faImages } from '@fortawesome/free-solid-svg-icons';
import { faEnvelope } from '@fortawesome/free-solid-svg-icons';
import { faPhone } from '@fortawesome/free-solid-svg-icons';
import { networkAdapter } from 'services/NetworkAdapter';
import ScheduledExperiencesList from '../../components/scheduled-experiences-list/ScheduledExperiencesList';
import ImageGalleryModal from '../../components/image-gallery-modal/ImageGalleryModal';
import LightboxOverlay from '../../components/image-gallery-modal/LightboxOverlay';
import ReviewSidebar from './components/ReviewSidebar';
import {
  buildExperienceGalleryImages,
  getOrganizerGalleryImages,
} from './experienceGalleryImages';

const CommentsModal = lazy(() => import('./CommentsModal'));
const OrganizerDetailsModal = lazy(() => import('./components/OrganizerDetailsModal'));
const AddCommentForm = lazy(() => import('../../components/comments/AddCommentForm'));
const FullCommentCard = lazy(() => import('../../components/comments/CommentCard'));

const OrganizerCard = React.memo(({ organizer, onSelect }) => {
  const fullName = organizer.name || `${organizer.firstName || ''} ${organizer.lastName || ''}`.trim() || 'Organizer';
  const initials = fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  return (
    <button
      type="button"
      className="border border-slate-200 rounded-xl px-3 py-4 flex flex-col items-center text-center hover:bg-slate-50"
      onClick={() => onSelect(organizer)}
    >
      {organizer.profilePicture ? (
        <img
          src={organizer.profilePicture}
          alt={fullName}
          className="w-16 h-16 rounded-full object-cover"
        />
      ) : (
        <div className="w-16 h-16 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-semibold">
          {initials || 'O'}
        </div>
      )}
      <p className="mt-3 text-sm font-semibold text-slate-700">{fullName}</p>
    </button>
  );
});

const ExperienceDetails = ({ previewData = null, isPreview = false }) => {
  const { experienceId } = useParams();
  const mapSectionRef = useRef(null);
  const [isCommentsModalOpen, setIsCommentsModalOpen] = useState(false); // Add state for comments modal
  const [selectedOrganizer, setSelectedOrganizer] = useState(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(null);
  const [lightboxOrigin, setLightboxOrigin] = useState(null);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [isMapIframeLoaded, setIsMapIframeLoaded] = useState(false);
  const [isMapLoadTimedOut, setIsMapLoadTimedOut] = useState(false);
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(min-width: 1024px)').matches
      : false
  );
  const [experienceDetails, setExperienceDetails] = useState({
    isLoading: !previewData,
    data: previewData || null,
  });
  const location = useLocation();
  const navigate = useNavigate();
  const [initialCartEdit, setInitialCartEdit] = useState(null);
  const [justPostedReview, setJustPostedReview] = useState(null);
  const [reviewEligibility, setReviewEligibility] = useState({ eligible: true, recentReview: null });

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const mediaQuery = window.matchMedia('(min-width: 1024px)');
    const handleMediaChange = (event) => {
      setIsDesktop(event.matches);
    };

    setIsDesktop(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleMediaChange);

    return () => {
      mediaQuery.removeEventListener('change', handleMediaChange);
    };
  }, []);

  useEffect(() => {
    if (previewData) {
      setExperienceDetails({
        isLoading: false,
        data: previewData,
      });
      return;
    }

    const fetchExperienceDetails = async () => {
      const response = await networkAdapter.get(`/api/experiences/${experienceId}`);
      setExperienceDetails({ isLoading: false, data: response?.data || null });
    };

    fetchExperienceDetails();
  }, [experienceId, previewData]);

  useEffect(() => {
    const cartEdit = location.state?.cartEdit || null;
    if (!cartEdit) {
      return;
    }

    setInitialCartEdit(cartEdit);
    navigate(location.pathname, { replace: true, state: null });
  }, [location.state, location.pathname, navigate]);

  const experienceData = experienceDetails.data;
  const comments = useMemo(() => experienceData?.comments || [], [experienceData]);
  const organizerImages = useMemo(
    () => getOrganizerGalleryImages(experienceData),
    [experienceData]
  );
  const galleryImages = useMemo(
    () => buildExperienceGalleryImages(experienceData, comments),
    [experienceData, comments]
  );
  const heroImages = useMemo(
    () => (organizerImages.length > 0 ? organizerImages : galleryImages),
    [organizerImages, galleryImages]
  );
  const previewImages = useMemo(() => heroImages.slice(0, 4), [heroImages]);
  const imageSlots = useMemo(
    () =>
      Array.from({ length: 4 }, (_, index) => {
        if (previewImages[index]) return previewImages[index];
        if (previewImages.length > 0) return previewImages[previewImages.length - 1];
        return null;
      }),
    [previewImages]
  );
  const roundedClasses = [
    'rounded-tl-xl',
    'rounded-tr-xl',
    'rounded-bl-xl',
    'rounded-br-xl',
  ];
  const descriptionParagraphs = useMemo(
    () =>
      (experienceData?.description || '')
        .split(/\n\s*\n/)
        .map((paragraph) => paragraph.trim())
        .filter(Boolean),
    [experienceData]
  );

  const { userDetails } = useContext(AuthContext);

  const refreshExperience = async () => {
    const resp = await networkAdapter.get(`/api/experiences/${experienceId}`);
    if (resp && resp.data) {
      setExperienceDetails({ isLoading: false, data: resp.data });
    }
  };

  useEffect(() => {
    if (!experienceData?.id || !userDetails) return;
    const checkEligibility = async () => {
      try {
        const resp = await networkAdapter.get(`/api/comments/eligibility?commentableType=experience&commentableId=${experienceData.id}`);
        if (resp && resp.eligible !== undefined) {
          setReviewEligibility(resp);
        }
      } catch (e) { /* ignore */ }
    };
    checkEligibility();
  }, [experienceData?.id, userDetails]);

  const renderStarsHelper = (count) =>
    Array.from({ length: Math.round(count || 0) })
      .map((_, i) => <FontAwesomeIcon key={i} icon={faStar} className="text-amber-500" />);

  const formatCommentDateHelper = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  };



  
  const commentsPreview = useMemo(() => {
    const topLevel = Array.isArray(comments) ? comments.filter((c) => !c.ParentId) : [];
    return topLevel.slice(0, 6);
  }, [comments]);
  const organizers = useMemo(() => experienceData?.organizers || [], [experienceData]);
  const previewUpcomingSessions = useMemo(
    () => (Array.isArray(experienceData?.previewUpcomingSessions) ? experienceData.previewUpcomingSessions : []),
    [experienceData]
  );

  const selectedOrganizerContactHref = selectedOrganizer?.contact?.email
    ? `mailto:${selectedOrganizer.contact.email}`
    : selectedOrganizer?.contact?.phoneNumber
      ? `tel:${selectedOrganizer.contact.phoneNumber}`
      : '';

  const selectedOrganizerContactLabel = selectedOrganizer?.contact?.email
    ? 'Contact Organizer'
    : selectedOrganizer?.contact?.phoneNumber
      ? 'Call Organizer'
      : 'Contact Unavailable';

  const mapCoordinates = useMemo(() => {
    const locationCoordinates = experienceData?.Location?.coordinates?.coordinates;
    const longitude = Array.isArray(locationCoordinates)
      ? Number(locationCoordinates[0])
      : null;
    const latitude = Array.isArray(locationCoordinates)
      ? Number(locationCoordinates[1])
      : null;
    const hasValidCoordinates = Number.isFinite(longitude) && Number.isFinite(latitude);
    const mapDelta = 0.003;
    const openStreetMapSrc = hasValidCoordinates
      ? `https://www.openstreetmap.org/export/embed.html?bbox=${longitude - mapDelta},${latitude - mapDelta},${longitude + mapDelta},${latitude + mapDelta}&layer=mapnik&marker=${latitude},${longitude}`
      : null;

    return {
      hasValidCoordinates,
      openStreetMapSrc,
    };
  }, [experienceData]);

  const { hasValidCoordinates, openStreetMapSrc } = mapCoordinates;

  useEffect(() => {
    if (!hasValidCoordinates || !openStreetMapSrc) {
      setIsMapIframeLoaded(false);
      setIsMapLoadTimedOut(false);
      return undefined;
    }

    setIsMapIframeLoaded(false);
    setIsMapLoadTimedOut(false);

    const timeoutId = window.setTimeout(() => {
      setIsMapLoadTimedOut(true);
    }, 8000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [hasValidCoordinates, openStreetMapSrc]);

  const hasImages = galleryImages.length > 0;
  const activeImage =
    selectedImageIndex !== null && hasImages ? galleryImages[selectedImageIndex] : null;

  const openGallery = () => {
    setSelectedImageIndex(null);
    setLightboxOrigin(null);
    setIsGalleryOpen(true);
  };

  const renderGallerySidebar = useCallback((imageData) => {
    if (!imageData || imageData.source !== 'guest' || !imageData.review) {
      return null;
    }

    return <ReviewSidebar review={imageData.review} />;
  }, []);

  useEffect(() => {
    if (!selectedOrganizer) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setSelectedOrganizer(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedOrganizer]);

  const openLightboxFromThumbnail = (index, element) => {
    const rect = element.getBoundingClientRect();
    const viewportCenterX = window.innerWidth / 2;
    const viewportCenterY = window.innerHeight / 2;
    const imageCenterX = rect.left + rect.width / 2;
    const imageCenterY = rect.top + rect.height / 2;

    const maxModalWidth = window.innerWidth * 0.92;
    const maxModalHeight = window.innerHeight * 0.88;
    const startScale = Math.max(
      0.15,
      Math.min(rect.width / maxModalWidth, rect.height / maxModalHeight)
    );

    setLightboxOrigin({
      x: imageCenterX - viewportCenterX,
      y: imageCenterY - viewportCenterY,
      scale: startScale,
    });
    setSelectedImageIndex(Math.min(index, galleryImages.length - 1));
  };

  if (experienceDetails.isLoading) {
    return <div className="container mx-auto p-6">Loading experience details...</div>;
  }

  if (!experienceData) {
    return <div className="container mx-auto p-6">Experience not found.</div>;
  }

  const renderExperienceHeader = () => (
    <>
      <h1 className="text-3xl font-semibold text-slate-800" data-testid="experience-details__title">
        {experienceData.title}
      </h1>
      <p className="text-base text-slate-600 mt-1" data-testid="experience-details__subtitle">{experienceData.subtitle}</p>
      <p className="text-base text-slate-700 mt-3" data-testid="experience-details__rating">
        <FontAwesomeIcon icon={faStar} className="text-amber-500" />{' '}
        {Number(experienceData.ratings || 0).toFixed(2)} ({experienceData.commentCount || 0}{' '}
        comments)
      </p>
    </>
  );

  const renderRightColumnContent = () => (
    <>
      <p className="text-base font-semibold text-slate-700">Hosted By</p>
      {organizers.length > 0 ? (
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
          {organizers.map((organizer) => (
            <OrganizerCard
              key={organizer.id || organizer.name || `${organizer.firstName || ''}-${organizer.lastName || ''}`}
              organizer={organizer}
              onSelect={setSelectedOrganizer}
            />
          ))}
        </div>
      ) : (
        <p className="text-base text-slate-600 mt-1">Organizer details coming soon</p>
      )}

      <button
        type="button"
        className="text-base text-blue-600 mt-4 hover:underline text-left block"
        onClick={() => {
          if (mapSectionRef.current) {
           mapSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }}
      >
        {experienceData.Location?.name || 'Location details unavailable'}
      </button>
      
      <ScheduledExperiencesList
        experienceCode={experienceData.experienceCode}
        startingPrice={experienceData.price}
        experienceTitle={experienceData.title}
        experienceSubtitle={experienceData.subtitle}
        experienceDurationMinutes={experienceData.duration}
        experienceThumbnail={experienceData.thumbnail}
        ticketTiers={experienceData.TicketTiers}
        experienceUserQuestionnary={experienceData.userQuestionnary}
        scheduleTimezone={experienceData?.Location?.timezone || 'UTC'}
        experienceLocation={experienceData.Location || null}
        previewSessions={isPreview ? previewUpcomingSessions : null}
        initialCartEdit={initialCartEdit}
      />
    </>
  );

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-4 lg:gap-6">
        {!isDesktop && (
          <div className="order-1 mb-6">
            {renderExperienceHeader()}
          </div>
        )}

        <div className="order-2 lg:order-1 lg:col-start-1 w-full self-start">
          <div className="relative w-full h-[52vh] lg:h-[72vh] grid grid-cols-2 grid-rows-2 gap-2">
            {imageSlots.map((image, index) =>
              image ? (
                <img
                  key={index}
                  src={image.imageUrl}
                  alt={image.accessibleText || experienceData.title}
                  className={`w-full h-full object-cover cursor-pointer ${roundedClasses[index]}`}
                  onClick={(event) =>
                    openLightboxFromThumbnail(index, event.currentTarget)
                  }
                />
              ) : (
                <div
                  key={index}
                  className={`w-full h-full bg-slate-200 ${roundedClasses[index]}`}
                />
              )
            )}

            {hasImages ? (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  openGallery();
                }}
                className="absolute bottom-3 right-3 h-12 w-12 rounded-full bg-black/75 text-white flex items-center justify-center shadow-sm hover:bg-black/85"
                aria-label="Open photos gallery"
              >
                <FontAwesomeIcon icon={faImages} className="text-lg" />
              </button>
            ) : null}
          </div>

          <div className="mt-6">
            <h2 className="text-2xl font-semibold text-slate-800">What You'll Do</h2>
            <div className="mt-2 space-y-3">
              {descriptionParagraphs.length > 0 ? (
                descriptionParagraphs.map((paragraph, index) => (
                  <p key={index} className="text-base text-slate-700 leading-7">
                    {paragraph}
                  </p>
                ))
              ) : (
                <p className="text-base text-slate-700 leading-7">
                  Full experience details will be shared soon.
                </p>
              )}
            </div>
          </div>
        </div>

        {!isDesktop && (
          <div className="order-4 w-full">
            {renderRightColumnContent()}
          </div>
        )}

        {isDesktop && (
          <div className="order-3 lg:col-start-2 w-full">
            {renderExperienceHeader()}
            <hr className="my-4 border-slate-200" />
            {renderRightColumnContent()}
          </div>
        )}

        <div className="order-5 lg:order-4 lg:col-start-1 mt-8" ref={mapSectionRef}>
            <h2 className="text-2xl font-semibold text-slate-800 mb-4">Where we'll meet</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-medium text-slate-800">
                  {experienceData.Location?.name || 'Location details unavailable'}
                </h3>
                <p className="text-base text-slate-700 leading-7 mt-2">
                  {[
                    experienceData.Location?.street,
                    experienceData.Location?.city,
                    experienceData.Location?.state,
                    experienceData.Location?.zipCode,
                    experienceData.Location?.country,
                  ].filter(Boolean).join(', ')}
                </p>
              </div>
              {hasValidCoordinates ? (
                <div className="rounded-xl overflow-hidden border border-slate-200 h-72 md:h-auto relative bg-slate-100">
                  {!isMapIframeLoaded && !isMapLoadTimedOut ? (
                    <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-600 bg-slate-100">
                      Loading map...
                    </div>
                  ) : null}
                  {isMapLoadTimedOut && !isMapIframeLoaded ? (
                    <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-600 bg-slate-100 px-4 text-center">
                      Map is taking longer than usual to load. Please wait a moment.
                    </div>
                  ) : null}
                  <iframe
                    title="Experience location map"
                    src={openStreetMapSrc}
                    className={`w-full h-full min-h-[18rem] transition-opacity duration-300 ${isMapIframeLoaded ? 'opacity-100' : 'opacity-0'}`}
                    loading="lazy"
                    onLoad={() => {
                      setIsMapIframeLoaded(true);
                      setIsMapLoadTimedOut(false);
                    }}
                  />
                </div>
              ) : null}
            </div>
          </div>

        <div className="order-6 lg:order-5 lg:col-start-1 mt-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-semibold text-slate-800 flex items-center gap-2">
                <FontAwesomeIcon icon={faStar} className="text-amber-500" />
                {Number(experienceData.ratings || 0).toFixed(2)} ({experienceData.commentCount || 0})
              </h2>
              {comments.length > 6 && (
                <button
                  onClick={() => setIsCommentsModalOpen(true)}
                  className="text-base text-blue-600 hover:underline font-semibold"
                >
                  Show All Reviews
                </button>
              )}
            </div>

            <div className="mt-4">
              {justPostedReview ? (
                <div className="transition-opacity duration-300">
                  <div className="bg-green-50 border border-green-400 text-green-800 p-4 rounded mb-4">
                    Thank you for your review!
                  </div>
                  <Suspense fallback={null}>
                    <FullCommentCard
                      comment={{ ...justPostedReview, commenter: userDetails, target: { type: 'experience', id: experienceData.id, name: experienceData.title } }}
                      userDetails={userDetails}
                      renderStars={renderStarsHelper}
                      formatCommentDate={formatCommentDateHelper}
                      loadComments={() => {
                        setJustPostedReview(null);
                        setReviewEligibility({ eligible: true, recentReview: null });
                        refreshExperience();
                      }}
                      commentsTargetType="experience"
                    />
                  </Suspense>
                </div>
              ) : !reviewEligibility.eligible && reviewEligibility.recentReview ? (
                <div className="transition-opacity duration-300">
                  <div className="bg-blue-50 border border-blue-400 text-blue-800 p-4 rounded mb-4">
                    You have already recently posted a review for this experience.
                  </div>
                  <Suspense fallback={null}>
                    <FullCommentCard
                      comment={{ ...reviewEligibility.recentReview, target: { type: 'experience', id: experienceData.id, name: experienceData.title } }}
                      userDetails={userDetails}
                      renderStars={renderStarsHelper}
                      formatCommentDate={formatCommentDateHelper}
                      loadComments={() => {
                        setReviewEligibility({ eligible: true, recentReview: null });
                        refreshExperience();
                      }}
                      commentsTargetType="experience"
                    />
                  </Suspense>
                </div>
              ) : (
                <Suspense fallback={null}>
                  <AddCommentForm
                    commentableType="experience"
                    commentableId={experienceData.id}
                    uploaderUserId={userDetails?.id}
                    onSuccess={(data) => {
                      setJustPostedReview(data);
                      refreshExperience();
                    }}
                    onCancel={() => {}}
                  />
                </Suspense>
              )}

              {comments.length > 0 ? (
                <Suspense fallback={null}>
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {commentsPreview.map((comment) => (
                      <FullCommentCard
                        key={comment.id}
                        comment={{
                          ...comment,
                          commenter: comment.commenter || comment.user,
                          target: comment.target || { type: 'experience', id: experienceData.id, name: experienceData.title },
                        }}
                        userDetails={userDetails}
                        renderStars={renderStarsHelper}
                        formatCommentDate={formatCommentDateHelper}
                        loadComments={() => refreshExperience()}
                        commentsTargetType="experience"
                      />
                    ))}
                  </div>
                </Suspense>
              ) : (
                <p className="mt-3 text-base text-slate-600">No comments yet for this experience.</p>
              )}
            </div>
          </div>
      </div>

      {activeImage ? (
        <LightboxOverlay
          images={galleryImages}
          currentIndex={selectedImageIndex}
          onClose={() => {
            setSelectedImageIndex(null);
            setLightboxOrigin(null);
          }}
          onNavigate={(direction) => {
            setLightboxOrigin(null);
            setSelectedImageIndex((prev) => {
              if (direction < 0) return prev === 0 ? galleryImages.length - 1 : prev - 1;
              return prev === galleryImages.length - 1 ? 0 : prev + 1;
            });
          }}
          onOpenGallery={() => {
            setSelectedImageIndex(null);
            setLightboxOrigin(null);
            setIsGalleryOpen(true);
          }}
          animationOrigin={lightboxOrigin}
          sidebar={renderGallerySidebar(activeImage)}
          title={experienceData.title}
        />
      ) : null}

      <ImageGalleryModal
        images={galleryImages}
        isOpen={isGalleryOpen}
        onClose={() => setIsGalleryOpen(false)}
        renderSidebar={renderGallerySidebar}
        title={experienceData.title}
      />

      {isCommentsModalOpen && (
        <Suspense fallback={null}>
          <CommentsModal
            isOpen={isCommentsModalOpen}
            onClose={() => setIsCommentsModalOpen(false)}
            comments={comments}
          />
        </Suspense>
      )}

      {selectedOrganizer ? (
        <Suspense fallback={null}>
          <OrganizerDetailsModal
            organizer={selectedOrganizer}
            contactHref={selectedOrganizerContactHref}
            contactLabel={selectedOrganizerContactLabel}
            onClose={() => setSelectedOrganizer(null)}
          />
        </Suspense>
      ) : null}
    </div>
  );
};

export default ExperienceDetails;
