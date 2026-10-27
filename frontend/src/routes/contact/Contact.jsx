import React from 'react';

const Contact = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-extrabold text-brand mb-6">Contact Us</h1>

      <p className="text-lg mb-4">
        We’re here to help with bookings, account questions, and platform support.
      </p>

      <h2 className="text-2xl font-extrabold text-brand mb-2">Email Support</h2>
      <p className="text-lg mb-4">
        Reach us at{' '}
        <a className="text-brand hover:underline" href="mailto:info@puertovallartatoday.com">
          info@puertovallartatoday.com
        </a>
        .
      </p>

      <h2 className="text-2xl font-extrabold text-brand mb-2">Hours</h2>
      <p className="text-lg mb-4">
        Support is available Monday through Friday, 9:00 AM to 6:00 PM.
      </p>

      <h2 className="text-2xl font-extrabold text-brand mb-2">Response Time</h2>
      <p className="text-lg">
        We typically respond within one business day.
      </p>
    </div>
  );
};

export default Contact;