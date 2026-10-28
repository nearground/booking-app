import { Link, useNavigate } from 'react-router-dom';
import { useContext, useRef } from 'react';
import useModalAccessibility from 'components/ux/modal/useModalAccessibility';
import { AuthContext } from 'contexts/AuthContext';
import { networkAdapter } from 'services/NetworkAdapter';
import ExperienceNavItem from 'components/navbar-items/ExperienceNavItem';

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
  const menuRef = useRef(null);
  useModalAccessibility({ isOpen: isVisible, onClose: onHamburgerMenuToggle, dialogRef: menuRef });

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
    <div data-testid="hamburger-menu" className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Close menu"
        className="absolute inset-0 min-h-full w-full bg-black/30"
        onClick={onHamburgerMenuToggle}
      />
      <div id="site-navigation-menu"
        ref={menuRef}
        role="dialog"
        aria-modal="true"
        aria-label="Site navigation"
        tabIndex={-1}
        className="absolute right-0 top-0 max-h-[calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom))] w-80 max-w-[calc(100vw-env(safe-area-inset-left)-env(safe-area-inset-right))] overflow-y-auto rounded-bl-2xl border border-white/20 bg-brand pt-[max(4.5rem,calc(env(safe-area-inset-top)+1rem))] shadow-2xl">
        <ul className="list-none my-4 px-4 space-y-3">
          <ExperienceNavItem onHamburgerMenuToggle={onHamburgerMenuToggle} compact />
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
