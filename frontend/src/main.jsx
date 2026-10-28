import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.scss';
import HotelsSearch from './routes/listings/HotelsSearch';
import UserProfile from './routes/user-profile/UserProfile';
import { Navigate, createBrowserRouter, RouterProvider, useParams } from 'react-router-dom';
import OrganizationSite from 'routes/organization-site/OrganizationSite';
import { resolveOrganizationSlugFromHost } from 'routes/organization-site/organizationSiteResolver';
import OrganizationBrandingEditor from 'routes/organizer-profile/OrganizationBrandingEditor';
import reportWebVitals from './reportWebVitals';
import Home from './routes/home/Home';
import { AuthProvider } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import HotelDetails from './routes/hotel-details/HotelDetails';
import Login from './routes/login/Login';
import Register from './routes/register/Register';
import AboutUs from './routes/about-us/AboutUs';
import Contact from './routes/contact/Contact';
import PrivacyPolicy from './routes/privacy-policy/PrivacyPolicy';
import Experiences from './routes/experiences/Experiences';
import Services from './routes/services/Services';
import ExperienceDetails from './routes/experience-details/ExperienceDetails';
import BaseLayout from './routes/layouts/base-layout/BaseLayout';
import ForgotPassword from './routes/forgot-password/ForgotPassword';
import ForgotUsername from './routes/forgot-username/ForgotUsername';
import ResetPassword from './routes/reset-password/ResetPassword';
import VerifyEmail from './routes/verify-email/VerifyEmail';
import Checkout from 'routes/checkout/Checkout';
import BookingConfirmation from 'routes/booking-confimation/BookingConfirmation';
import RequireAuth from 'routes/guards/RequireAuth';
import RequireOrganizer from 'routes/guards/RequireOrganizer';
import OrganizerSignup from 'routes/organizer-signup/OrganizerSignup';
import CreateExperience from 'routes/create-experience/CreateExperience';
import EditExperience from 'routes/edit-experience/EditExperience';
import CreateService from 'routes/create-service/CreateService';
import OrganizerProfile from 'routes/organizer-profile/OrganizerProfile';
import SessionDetails from 'routes/session-details/SessionDetails';

const OrganizationSiteByPath = () => <OrganizationSite slug={useParams().slug} />;
const HostAwareRoot = () => {
  const slug = resolveOrganizationSlugFromHost(window.location.hostname);
  return slug ? <OrganizationSite slug={slug} /> : <BaseLayout />;
};

const router = createBrowserRouter([
  { path: '/o/:slug', element: <OrganizationSiteByPath /> },
  {
    path: '/',
    element: <HostAwareRoot />,
    children: [
      {
        path: '/',
        element: <Navigate to="/experiences" replace />,
      },
      // {
      //   path: '/home',
      //   element: <Home />,
      // },
      {
        path: '/hotels',
        element: <HotelsSearch />,
      },
      {
        path: '/about-us',
        element: <AboutUs />,
      },
      {
        path: '/contact',
        element: <Contact />,
      },
      {
        path: '/privacy-policy',
        element: <PrivacyPolicy />,
      },
      {
        path: '/experiences',
        element: <Experiences />,
      },
      {
        path: '/events',
        element: <Experiences />,
      },
      // {
      //   path: '/services',
      //   element: <Services />,
      // },
      {
        path: '/experience/:experienceId',
        element: <ExperienceDetails />,
      },
      {
        element: <RequireAuth />,
        children: [
          {
            path: '/user-profile',
            element: <UserProfile />,
          },
          {
            path: '/organizer-profile',
            element: <OrganizerProfile />,
          },
          {
            path: '/organizer-profile/branding/:organizationId',
            element: <OrganizationBrandingEditor />,
          },
          {
            path: '/session-details/:sessionId',
            element: <SessionDetails />,
          },
          {
            element: <RequireOrganizer />,
            children: [
              {
                path: '/create-experience',
                element: <CreateExperience />,
              },
              {
                path: '/edit-experience/:experienceId',
                element: <EditExperience />,
              },
              {
                path: '/create-service',
                element: <CreateService />,
              },
            ],
          },
        ],
      },
      {
        path: '/login',
        element: <Login />,
      },
      {
        path: '/register',
        element: <Register />,
      },
      {
        path: '/organizer-signup',
        element: <OrganizerSignup />,
      },
      {
        path: '/organizer-signup/invite',
        element: <OrganizerSignup />,
      },
      {
        path: '/hotel/:hotelId',
        element: <HotelDetails />,
      },
      {
        path: '/forgot-password',
        element: <ForgotPassword />,
      },
      {
        path: '/forgot-username',
        element: <ForgotUsername />,
      },
      {
        path: '/reset-password',
        element: <ResetPassword />,
      },
      {
        path: '/verify-email',
        element: <VerifyEmail />,
      },
      {
        path: '/checkout',
        element: <Checkout />,
      },
      {
        path: '/booking-confirmation',
        element: <BookingConfirmation />,
      },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById('root')).render(
  <AuthProvider>
    <CartProvider>
      <RouterProvider router={router} />
    </CartProvider>
  </AuthProvider>
);

reportWebVitals();
