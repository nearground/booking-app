import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Tabs from 'components/ux/tabs/Tabs';
import TabPanel from 'components/ux/tab-panel/TabPanel';
import {
  faAddressCard,
  faHotel,
  faCreditCard,
} from '@fortawesome/free-solid-svg-icons';
import { AuthContext } from 'contexts/AuthContext';
import { networkAdapter } from 'services/NetworkAdapter';
import PaymentMethodsPanel from './components/PaymentsMethodsPanel';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBars } from '@fortawesome/free-solid-svg-icons';
import { faXmark } from '@fortawesome/free-solid-svg-icons';
import useOutsideClickHandler from 'hooks/useOutsideClickHandler';
import { useNavigate } from 'react-router-dom';
import BookingPanel from './components/BookingPanel';
import ProfileDetailsPanel from './components/ProfileDetailsPanel';
import CommentsSection from 'components/comments/CommentsSection';

/**
 * UserProfile
 * Renders the user profile page with tabs for personal details, bookings, and payment methods.
 * @returns {JSX.Element} - The UserProfile component
 * */
const UserProfile = () => {
  const { userDetails } = useContext(AuthContext);
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

  const renderStars = (stars) => {
    const roundedStars = Math.max(0, Math.min(5, Math.round(Number(stars) || 0)));
    return `${'★'.repeat(roundedStars)}${'☆'.repeat(5 - roundedStars)}`;
  };
  const formatCommentDate = (value) => {
    if (!value) return 'Unknown time';
    const parsedDate = new Date(value);
    if (Number.isNaN(parsedDate.getTime())) {
      return 'Unknown time';
    }

    return parsedDate.toLocaleString();
  };

  const navigate = useNavigate();
  const location = useLocation();

  const wrapperRef = useRef();
  const buttonRef = useRef();

  const queryTab = new URLSearchParams(location.search).get('tab');
  const showWelcome = new URLSearchParams(location.search).get('welcome') === '1';
  const [isTabsVisible, setIsTabsVisible] = useState(false);
  // Fetch user orders data
  const [userOrdersData, setUserOrdersData] = useState({
    isLoading: true,
    data: [],
    errors: [],
  });

  // Fetch user payment methods data
  const [userPaymentMethodsData, setUserPaymentMethodsData] = useState({
    isLoading: true,
    data: [],
    errors: [],
  });

  useOutsideClickHandler(wrapperRef, (event) => {
    if (!buttonRef.current.contains(event.target)) {
      setIsTabsVisible(false);
    }
  });

  const onTabsMenuButtonAction = () => {
    setIsTabsVisible(!isTabsVisible);
  };

  // effect to set initial state of user details
  useEffect(() => {
    if (!userDetails) {
      navigate('/login');
    }
  }, [navigate, userDetails]);

  // effect to set initial state of user bookings data
  useEffect(() => {
    const getInitialData = async () => {
      const userPaymentMethodsResponse = await networkAdapter.get(
        'api/users/payment-methods'
      );
      const userOrdersResponse = await networkAdapter.get('/api/orders');
      if (userPaymentMethodsResponse && userPaymentMethodsResponse.data) {
        setUserPaymentMethodsData({
          isLoading: false,
          data: Array.isArray(userPaymentMethodsResponse.data.elements)
            ? userPaymentMethodsResponse.data.elements
            : [],
          errors: userPaymentMethodsResponse.errors,
        });
      }
      if (userOrdersResponse && userOrdersResponse.data) {
        setUserOrdersData({
          isLoading: false,
          data: Array.isArray(userOrdersResponse.data.orders)
            ? userOrdersResponse.data.orders
            : [],
          errors: userOrdersResponse.errors || [],
        });
      }
    };
    getInitialData();
  }, []);



const loadReceivedComments = useCallback(
  async ({ page = 1, append = false } = {}) => {
    setIsLoadingReceivedComments(true);
    setReceivedCommentsError('');
    const response = await networkAdapter.get(`/api/comments/sent/${userDetails?.id}`, {
      currentPage: page,
      pageSize: receivedCommentsPageSize,
      sortType: receivedCommentsSortType
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
  [receivedCommentsPageSize, receivedCommentsSortType, userDetails]
);

// Automatically load comments when userDetails is available
useEffect(() => {
  if (userDetails && userDetails.id) {
    loadReceivedComments({ page: 1, append: false });
  }
}, [userDetails, loadReceivedComments]);










  return (
    <>
      <div className="container mx-auto p-4 my-10 min-h-[530px]">
        <div className="mx-4">
          <button
            ref={buttonRef}
            onClick={onTabsMenuButtonAction}
            className="block md:hidden items-center px-4 py-1.5 border border-gray-300 font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <FontAwesomeIcon
              icon={isTabsVisible ? faXmark : faBars}
              size="lg"
            />
          </button>
        </div>
        {showWelcome && (
          <div role="status" className="mx-4 mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold">Welcome!</h2>
                <p className="mt-1 text-sm">Your verified guest bookings are available in Bookings.</p>
              </div>
              <button type="button" className="text-sm underline" onClick={() => navigate('/user-profile', { replace: true })}>Dismiss</button>
            </div>
          </div>
        )}
        <Tabs initialActiveTab={queryTab || 'Personal Details'} isTabsVisible={isTabsVisible} wrapperRef={wrapperRef}>
          <TabPanel label="Personal Details" icon={faAddressCard}>
            <ProfileDetailsPanel userDetails={userDetails} />
          </TabPanel>
          <TabPanel label="Bookings" icon={faHotel}>
            <BookingPanel orders={userOrdersData.data} isLoadingOrders={userOrdersData.isLoading} />
          </TabPanel>
          <TabPanel label="Payment details" icon={faCreditCard}>
            <PaymentMethodsPanel
              userPaymentMethodsData={userPaymentMethodsData}
              setUserPaymentMethodsData={setUserPaymentMethodsData}
            />
          </TabPanel>
          <TabPanel label="Reviews" icon={faAddressCard}>
            
            <CommentsSection
              displayText='View your reviews here.'
              userDetails={userDetails}
              comments={receivedComments}
              commentsTargetType={receivedCommentsTargetType}
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
                    from: { pathname: '/user-profile' },
                  },
                })
              }
            />
          </TabPanel>
        </Tabs>
      </div>
    </>
  );
};

export default UserProfile;
