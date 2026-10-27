import { Link } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from 'contexts/AuthContext';

/**
 * NavbarProfiles Component
 * Renders the user profile section buttons in the navbar. It displays the user's or organizer's profile picture and name if authenticated.
 *
 * @param {Object} props - Props for the component.
 * @param {boolean} props.isAuthenticated - Indicates whether the user is authenticated.
 */
const NavbarProfiles = (props) => {
  const { isAuthenticated, isAuthResolved, userDetails } = useContext(AuthContext);

  const hasOrganizerProfile = Boolean(userDetails?.organizerProfile);
  const canShowUserProfile = Boolean(isAuthResolved) && Boolean(isAuthenticated) && Boolean(userDetails);
  const canShowOrganizerActions =
    canShowUserProfile && Boolean(hasOrganizerProfile);
 

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div>    
        {canShowUserProfile && (
        <li className="flex items-center ml-2">
            <Link to={hasOrganizerProfile? "/organizer-profile": "/user-profile"} className="flex items-center group">
            {/* Profile picture */}
            {userDetails.profilePicture ? (
              <img
                src={userDetails.profilePicture}
                alt="Profile"
                className="w-8 h-8 rounded-full border border-slate-300 group-hover:border-brand"
              />
            ) : (
              <span className="w-8 h-8 rounded-full bg-slate-400 flex items-center justify-center text-white text-sm font-bold">
                {userDetails.firstName ? userDetails.firstName.charAt(0) : '?'}
              </span>
            )}
            {/* First name */}
            <span className="font-medium text-slate-100 group-hover:text-brand">
              {userDetails.firstName || 'User'}
            </span>
          </Link>
        </li>
      )
    }
    </div>
  );
}

export default NavbarProfiles;