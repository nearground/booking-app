import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const GuestCommentPrompt = () => {
  const location = useLocation();

  return (
    <p className="text-sm text-slate-500">
      <Link to="/login" state={{ from: location }} className="inline-flex min-h-11 items-center text-blue-600 hover:underline">
        Log in to comment
      </Link>
    </p>
  );
};

export default GuestCommentPrompt;