import { Link, useLocation } from 'react-router-dom';

const ExperienceNavItem = ({ onHamburgerMenuToggle, compact = false }) => {
  const location = useLocation();
  const itemClass = compact
    ? 'block rounded-md px-4 py-3 uppercase font-medium text-slate-100 hover:bg-emerald-900'
    : 'uppercase font-medium text-slate-100 hover-underline-animation';
  const itemClassName = (path) => `${itemClass}${location.pathname === path ? ' active-link' : ''}`;

  return (
    <>
      <li className={compact ? '' : 'p-4 hover:bg-emerald-900 md:hover:bg-brand'}>
        <Link to="/experiences" className={itemClassName('/experiences')} onClick={onHamburgerMenuToggle}>
          Experiences
        </Link>
      </li>
      <li className={compact ? '' : 'p-4 hover:bg-emerald-900 md:hover:bg-brand'}>
        <Link to="/events" className={itemClassName('/events')} onClick={onHamburgerMenuToggle}>
          Events
        </Link>
      </li>
    </>
  );
};

export default ExperienceNavItem;
