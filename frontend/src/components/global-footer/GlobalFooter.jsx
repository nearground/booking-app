import React from 'react';
import { Link } from 'react-router-dom';

const FooterLink = ({ to, label }) => (
  <Link
    to={to}
    className="block text-slate-700 hover:text-brand transition-colors duration-300"
  >
    {label}
  </Link>
);

const GlobalFooter = () => {
  return (
    <footer className="global-footer mt-6 bg-slate-50 text-slate-700">
      <div className="container mx-auto px-6 py-6">
        <div className="flex flex-wrap justify-between">
          <div className="w-full md:w-1/3 mb-6 md:mb-0">
            <h4 className="font-bold text-lg mb-2">Company Info</h4>
            <FooterLink to="/about-us" label="About Us" />
            <FooterLink to="/contact" label="Contact" />
            <FooterLink to="/privacy-policy" label="Privacy Policy" />
          </div>
          <div className="w-full md:w-1/3 mb-6 md:mb-0">
            <h4 className="font-bold text-lg mb-2">Support</h4>
            <FooterLink to="/" label="FAQs" />
          </div>
          <div className="w-full md:w-1/3 mb-6 md:mb-0">
            <h4 className="font-bold text-lg mb-2">Newsletter</h4>
            <p>Stay updated with our latest trends</p>
            <form className="mt-3 flex flex-wrap items-center gap-2">
              <input
                type="email"
                placeholder="Enter email"
                className="min-w-0 flex-1 rounded border border-slate-300 p-2"
              />
              <button className="touch-target rounded bg-brand px-4 py-2 text-white">
                Subscribe
              </button>
            </form>
          </div>
        </div>
        <div className="text-center mt-10">
          <p>
            &copy; {new Date().getFullYear()} Von Gagner. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default GlobalFooter;
