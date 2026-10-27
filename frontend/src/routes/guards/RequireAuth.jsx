import { useContext } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { AuthContext } from 'contexts/AuthContext';

const RequireAuth = () => {
  const { isAuthenticated, isAuthResolved } = useContext(AuthContext);
  const location = useLocation();

  if (!isAuthResolved) {
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
};

export default RequireAuth;
