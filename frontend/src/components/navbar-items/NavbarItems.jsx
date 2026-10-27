import { Link, useNavigate, useLocation } from 'react-router-dom';
import DropdownButton from 'components/ux/dropdown-button/DropdownButton';
import { networkAdapter } from 'services/NetworkAdapter';
import { useContext } from 'react';
import { AuthContext } from 'contexts/AuthContext';

/**
 * A component that renders the navigation items for the navbar for both mobile/desktop view.
 *
 * @param {Object} props - The component's props.
 * @param {boolean} props.isAuthenticated - A flag indicating whether the user is authenticated.
 * @param {Function} props.onHamburgerMenuToggle
 * @param {boolean} props.showOnlyMainLinks - If true, only shows Home, Hotels, and Experiences links
 */
const NavbarItems = ({ isAuthenticated, onHamburgerMenuToggle, showOnlyMainLinks = false }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const context = useContext(AuthContext);
  const hasOrganizerProfile = Boolean(context.userDetails?.organizerProfile);
  const canDetermineOrganizerState = Boolean(context.isAuthResolved);

  /**
   * Handles the logout action by calling the logout API and updating the authentication state.
   */
  const handleLogout = async () => {
    await networkAdapter.post('api/users/logout');
    context.triggerAuthCheck();
    navigate('/login');
  };

  const dropdownOptions = [
    { name: 'Profile', onClick: () => navigate('/user-profile') },
    ...(canDetermineOrganizerState && !hasOrganizerProfile
      ? [{ name: 'Become Organizer', onClick: () => navigate('/organizer-signup') }]
      : []),
    ...(hasOrganizerProfile
      ? [{ name: 'Organizer Profile', onClick: () => navigate('/organizer-profile') }]
      : []),
    ...(hasOrganizerProfile
      ? [{ name: 'Create Experience', onClick: () => navigate('/create-experience') }]
      : []),
    { name: 'Logout', onClick: handleLogout },
  ];

  /**
   * Determines if a given path is the current active path.
   *
   * @param {string} path - The path to check.
   * @returns {boolean} - True if the path is active, false otherwise.
   */
  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <>
      <li className="p-4 hover:bg-emerald-900 md:hover:bg-brand">
        {/* <Link
          to="/home"
          className={`uppercase font-medium text-slate-100 hover-underline-animation ${
            isActive('/home') && 'active-link'
          }`}
          onClick={onHamburgerMenuToggle}
        >
          Hotels
        </Link> */}
      </li>
      <li className="p-4 hover:bg-emerald-900 md:hover:bg-brand">
        <Link
          to="/experiences"
          className={`uppercase font-medium text-slate-100 hover-underline-animation ${
            isActive('/experiences') && 'active-link'
          }`}
          onClick={onHamburgerMenuToggle}
        >
          Experiences
        </Link>
      </li>
      <li className="p-4 hover:bg-emerald-900 md:hover:bg-brand">
        {/* <Link
          to="/services"
          className={`uppercase font-medium text-slate-100 hover-underline-animation ${
            isActive('/services') && 'active-link'
          }`}
          onClick={onHamburgerMenuToggle}
        >
          Services
        </Link> */}
      </li>
      {!showOnlyMainLinks && (
        <>
          <li
            className={`${!isAuthenticated && 'p-4 hover:bg-emerald-900 md:hover:bg-brand'}`}
          >
            {isAuthenticated ? (
              <DropdownButton triggerType="click" options={dropdownOptions} />
            ) : (
              <Link
                to="/login"
                className={`uppercase font-medium text-slate-100 hover-underline-animation ${
                  isActive('/login') && 'active-link'
                }`}
                onClick={onHamburgerMenuToggle}
              >
              Login or Sign Up!
              </Link>
            )}
          </li>
        </>
      )}
    </>
  );
};

export default NavbarItems;
