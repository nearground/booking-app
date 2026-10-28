import logo from 'assests/logos/puerto_vallarta_today_logo.svg';
import { useState, useContext } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import HamburgerMenu from 'components/hamburger-menu/HamburgerMenu';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBars, faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons';
import { AuthContext } from 'contexts/AuthContext';
import NavbarItems from 'components/navbar-items/NavbarItems';
import NavbarProfiles from 'components/navbar-profiles/NavbarProfiles';

const GlobalNavbar = () => {
  const [isVisible, setIsVisible] = useState(false);
  const { isAuthenticated } = useContext(AuthContext);
  const location = useLocation();
  const navigate = useNavigate();
  const onHamburgerMenuToggle = () => setIsVisible((visible) => !visible);
  const isExperiencePage = ['/experiences', '/events'].includes(location.pathname);
  const mapIsVisible = new URLSearchParams(location.search).get('map') === '1';
  const searchLabel = location.pathname === '/events' ? 'events' : 'experiences';
  const toggleMapSearch = () => {
    const searchParams = new URLSearchParams(location.search);
    if (mapIsVisible) searchParams.delete('map');
    else searchParams.set('map', '1');
    const search = searchParams.toString();
    navigate(`${location.pathname}${search ? `?${search}` : ''}`);
  };

  return (
    <>
      <header className="relative z-30 flex min-h-[4.5rem] w-full min-w-0 flex-wrap items-center justify-between gap-2 bg-brand px-4 shadow-md md:px-12 global-navbar__container brand-divider-bottom">
        <div className="flex min-w-0 items-center gap-2">
          <Link to="/experiences" aria-label="Puerto Vallarta Today home" className="touch-target flex shrink-0 items-center">
            <img src={logo} alt="Puerto Vallarta Today" className="site-logo__img" />
          </Link>
          <div data-testid="language-switcher-slot" className="h-11 w-11 shrink-0" aria-hidden="true" />
          {import.meta.env.DEV && (
            <a href="/internal/docs/" className="hidden rounded bg-white/10 px-3 py-2 text-sm font-medium text-white sm:inline-flex sm:items-center">
              Internal docs
            </a>
          )}
        </div>
        <ul className="hidden list-none md:absolute md:left-1/2 md:flex md:-translate-x-1/2">
          <NavbarItems isAuthenticated={isAuthenticated} showOnlyMainLinks={true} />
        </ul>
        <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-4">
          <NavbarProfiles isAuthenticated={isAuthenticated} className="cursor-pointer" />
          <button
            type="button"
            data-testid="menu-toggle__button"
            aria-label={isVisible ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={isVisible}
            aria-controls="site-navigation-menu"
            className="touch-target inline-flex items-center justify-center rounded-md text-white hover:bg-emerald-800 focus-visible:outline-offset-2"
            onClick={onHamburgerMenuToggle}
          >
            <FontAwesomeIcon icon={faBars} size="lg" aria-hidden="true" />
          </button>
        </div>
        <HamburgerMenu
          isVisible={isVisible}
          onHamburgerMenuToggle={onHamburgerMenuToggle}
          isAuthenticated={isAuthenticated}
        />
      </header>
      {isExperiencePage ? (
        <button
          type="button"
          className="experience-search-fab"
          aria-label={`${mapIsVisible ? 'Close' : 'Open'} ${searchLabel} search`}
          aria-pressed={mapIsVisible}
          onClick={toggleMapSearch}
        >
          <FontAwesomeIcon icon={faMagnifyingGlass} aria-hidden="true" />
        </button>
      ) : null}
    </>
  );
};

export default GlobalNavbar;
