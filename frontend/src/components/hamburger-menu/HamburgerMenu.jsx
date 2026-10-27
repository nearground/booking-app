import { Link, useNavigate } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from 'contexts/AuthContext';
import { networkAdapter } from 'services/NetworkAdapter';

/**
 * HamburgerMenu Component
 * Renders a hamburger menu with navigation links. It can be toggled visible or hidden.
 * The menu contains links to Home, Hotels, About Us, and depending on the authentication status,
 * a link to either the user profile or the login/register page.
 *
 * @param {Object} props - Props for the component.
 * @param {boolean} props.isVisible - Controls the visibility of the hamburger menu.
 * @param {Function} props.onHamburgerMenuToggle - Callback function to toggle the visibility of the menu.
 * @param {boolean} props.isAuthenticated - Indicates whether the user is authenticated.
 */
const HamburgerMenu = (props) => {
  const { isVisible, onHamburgerMenuToggle } = props;
  const { isAuthenticated, isAuthResolved, userDetails, triggerAuthCheck } = useContext(AuthContext);
  const navigate = useNavigate();

  const hasOrganizerProfile = Boolean(userDetails?.organizerProfile);
  const canShowOrganizerActions =
    Boolean(isAuthResolved) && Boolean(isAuthenticated) && Boolean(hasOrganizerProfile);

  const handleLogout = async () => {
    await networkAdapter.post('api/users/logout');
    triggerAuthCheck();
    onHamburgerMenuToggle();
    navigate('/login');
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div data-testid="hamburger-menu" className="fixed inset-0 z-20">
      <button
        type="button"
        aria-label="Close menu"
        className="absolute inset-0 bg-transparent"
        onClick={onHamburgerMenuToggle}
      />
      <div className="absolute right-4 top-16 w-72 max-w-[80vw] rounded-2xl border border-white/20 bg-brand shadow-2xl z-30">
        <ul className="list-none my-4 px-4 space-y-3">
          {!isAuthenticated && (
            <li>
              <Link
                to="/login"
                className="block w-full rounded-md px-4 py-3 text-center uppercase font-medium text-slate-100 hover:bg-emerald-900"
                onClick={onHamburgerMenuToggle}
              >
                Log In / Sign Up
              </Link>
            </li>
          )}

          {!isAuthenticated && (
            <li>
              <Link
                to="/organizer-signup"
                className="block w-full rounded-md px-4 py-3 text-center uppercase font-medium text-slate-100 hover:bg-emerald-900"
                onClick={onHamburgerMenuToggle}
              >
                Become an Organizer!
              </Link>
            </li>
          )}

          {isAuthenticated && (
            <li>
              <Link
                to="/user-profile"
                className="block w-full rounded-md px-4 py-3 text-center uppercase font-medium text-slate-100 hover:bg-emerald-900"
                onClick={onHamburgerMenuToggle}
              >
                Profile
              </Link>
            </li>
          )}

          {isAuthenticated && !hasOrganizerProfile && (
            <li>
              <Link
                to="/organizer-signup"
                className="block w-full rounded-md px-4 py-3 text-center uppercase font-medium text-slate-100 hover:bg-emerald-900"
                onClick={onHamburgerMenuToggle}
              >
                Start Hosting
              </Link>
            </li>
          )}

          {canShowOrganizerActions && (
            <li>
              <Link
                to="/organizer-profile"
                className="block w-full rounded-md px-4 py-3 text-center uppercase font-medium text-slate-100 hover:bg-emerald-900"
                onClick={onHamburgerMenuToggle}
              >
                Organizer Profile
              </Link>
            </li>
          )}

          {canShowOrganizerActions && (
            <li>
              <Link
                to="/create-experience"
                className="block w-full rounded-md px-4 py-3 text-center uppercase font-medium text-slate-100 hover:bg-emerald-900"
                onClick={onHamburgerMenuToggle}
              >
                Create Experience
              </Link>
            </li>
          )}


          <li>
            {isAuthenticated ? (
              <button
                type="button"
                className="block w-full rounded-md px-4 py-3 text-center uppercase font-medium text-slate-100 hover:bg-emerald-900"
                onClick={handleLogout}
              >
                Logout {/* TODO: Update navigation buttons after logout */}
              </button>
            ) : (
              <button
                type="button"
                className="block w-full rounded-md px-4 py-3 text-center uppercase font-medium text-slate-100 hover:bg-emerald-900"
                onClick={onHamburgerMenuToggle}
              >
                Gift Card
              </button>
            )}
          </li>
        </ul>
      </div>
    </div>
  );
};

export default HamburgerMenu;
