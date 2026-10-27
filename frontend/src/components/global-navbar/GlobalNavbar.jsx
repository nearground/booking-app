import logo from 'assests/logos/puerto_vallarta_today_logo.svg';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import HamburgerMenu from 'components/hamburger-menu/HamburgerMenu';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBars } from '@fortawesome/free-solid-svg-icons';
import { AuthContext } from 'contexts/AuthContext';
import { useContext } from 'react';
import NavbarItems from 'components/navbar-items/NavbarItems';
import NavbarProfiles from 'components/navbar-profiles/NavbarProfiles';

const GlobalNavbar = () => {
  const [isVisible, setIsVisible] = useState(false);
  const { isAuthenticated } = useContext(AuthContext);
  const onHamburgerMenuToggle = () => {
    setIsVisible(!isVisible);
  };

  return (
    <div className="relative flex flex-wrap justify-between items-center px-4 md:px-12 global-navbar__container bg-brand brand-divider-bottom shadow-md">
      <div className="flex">
        <Link to="/experiences">
          <img src={logo} alt="site logo" className="site-logo__img" />
        </Link>
        {import.meta.env.DEV && (
          <a
            href="/internal/docs/"
            className="ml-4 self-center rounded bg-white/10 px-3 py-2 text-sm font-medium text-white"
          >
            Internal docs
          </a>
        )}
      </div>
      <ul className="list-none hidden md:flex md:absolute md:left-1/2 md:-translate-x-1/2">
        <NavbarItems isAuthenticated={isAuthenticated} showOnlyMainLinks={true} />
      </ul>


      <div className="flex items-center gap-4 absolute right-4 md:right-12">
        <NavbarProfiles 
          isAuthenticated={isAuthenticated}
          className="cursor-pointer"
        />
        <FontAwesomeIcon
          data-testid="menu-toggle__button"
          icon={faBars}
          size="2x"
          color="#fff"
          className="cursor-pointer"
          onClick={onHamburgerMenuToggle}
        />
      </div>

      <HamburgerMenu
        isVisible={isVisible}
        onHamburgerMenuToggle={onHamburgerMenuToggle}
        isAuthenticated={isAuthenticated}
      />
    </div>
  );
};

export default GlobalNavbar;
