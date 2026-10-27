import GlobalFooter from 'components/global-footer/GlobalFooter';
import GlobalNavbar from 'components/global-navbar/GlobalNavbar';
import { Outlet } from 'react-router-dom';
import ScrollToTop from 'components/scroll-to-top/ScrollToTop';
import CartFAB from 'components/cart/CartFAB';
import CartModal from 'components/cart/CartModal';

const BaseLayout = () => (
  <div className="flex min-h-dvh min-w-0 flex-col">
    <GlobalNavbar />
    <ScrollToTop />
    <main className="w-full min-w-0 flex-1">
      <Outlet />
    </main>
    <GlobalFooter />
    <CartFAB />
    <CartModal />
  </div>
);

export default BaseLayout;
