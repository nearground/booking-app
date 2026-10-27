import { useContext } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { AuthContext } from 'contexts/AuthContext';

const RequireOrganizer = () => {
  const { isAuthenticated, isAuthResolved, userDetails } = useContext(AuthContext);
  const location = useLocation();

  if (!isAuthResolved) {
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (!userDetails?.organizerProfile) {
    return <Navigate to="/organizer-profile" replace />;
  }

  return <Outlet />;
};

export default RequireOrganizer;
