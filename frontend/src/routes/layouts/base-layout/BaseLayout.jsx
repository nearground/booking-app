import GlobalFooter from 'components/global-footer/GlobalFooter';
import GlobalNavbar from 'components/global-navbar/GlobalNavbar';
import { Outlet } from 'react-router-dom';
import ScrollToTop from 'components/scroll-to-top/ScrollToTop';
import CartFAB from 'components/cart/CartFAB';
import CartModal from 'components/cart/CartModal';

/**
 * BaseLayout Component
 * Renders the base layout for the application.
 * It includes the global navbar, the main content, and the global footer.
 * @returns {JSX.Element} - The BaseLayout component.
 */
const BaseLayout = () => {
  return (
    <>
      <GlobalNavbar />
      <ScrollToTop />
      <Outlet />
      <GlobalFooter />
      <CartFAB />
      <CartModal />
    </>
  );
};

export default BaseLayout;
