import React from 'react';

const PrivacyPolicy = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-extrabold text-brand mb-6">Privacy Policy</h1>

      <p className="text-lg mb-4">
        We value your privacy and are committed to protecting your personal information.
        This policy explains how we collect, use, and protect data when you use our
        services.
      </p>

      <h2 className="text-2xl font-extrabold text-brand mb-2">Information We Collect</h2>
      <p className="text-lg mb-4">
        We may collect account details, booking information, contact details, and usage
        data needed to provide and improve our platform.
      </p>

      <h2 className="text-2xl font-extrabold text-brand mb-2">How We Use Information</h2>
      <p className="text-lg mb-4">
        Your information is used to process bookings, provide customer support, improve
        product performance, and communicate important updates. We never sell your data
        to third parties.
      </p>

      <h2 className="text-2xl font-extrabold text-brand mb-2">Data Protection</h2>
      <p className="text-lg mb-4">
        We implement reasonable technical and organizational safeguards to protect your
        data against unauthorized access, misuse, or disclosure.
      </p>

      <h2 className="text-2xl font-extrabold text-brand mb-2">Contact</h2>
      <p className="text-lg">
        If you have privacy-related questions, contact us at{' '}
        <a className="text-brand hover:underline" href="mailto:info@puertovallartatoday.com">
          info@puertovallartatoday.com
        </a>
        .
      </p>
    </div>
  );
};

export default PrivacyPolicy;