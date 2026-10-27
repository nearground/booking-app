import React, { createContext, useState, useEffect, useCallback, useRef } from 'react';
import { networkAdapter } from 'services/NetworkAdapter';

export const AuthContext = createContext();

/**
 * Provides authentication state and user details to the application.
 * @namespace AuthProvider
 * @component
 */
export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userDetails, setUserDetails] = useState(null);
  const [isAuthResolved, setIsAuthResolved] = useState(false);
  const authSnapshotRef = useRef({
    isAuthenticated: false,
    userDetails: null,
  });

  useEffect(() => {
    authSnapshotRef.current = {
      isAuthenticated,
      userDetails,
    };
  }, [isAuthenticated, userDetails]);

  const checkAuthStatus = useCallback(async () => {
    setIsAuthResolved(false);

    const response = await networkAdapter.get('api/users/auth-user');
    if (response && response.data && response.data.isAuthenticated) {
      setIsAuthenticated(response.data.isAuthenticated);
      setUserDetails(response.data.userDetails);
      setIsAuthResolved(true);
      return true;
    }

    const hasKnownAuthenticatedSession =
      authSnapshotRef.current.isAuthenticated &&
      Boolean(authSnapshotRef.current.userDetails);

    if (hasKnownAuthenticatedSession && response?.errors?.length) {
      setIsAuthResolved(true);
      return true;
    }

    setIsAuthenticated(false);
    setUserDetails(null);
    setIsAuthResolved(true);
    return false;
  }, []);

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  const triggerAuthCheck = useCallback(async () => checkAuthStatus(), [checkAuthStatus]);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        userDetails,
        isAuthResolved,
        triggerAuthCheck,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
