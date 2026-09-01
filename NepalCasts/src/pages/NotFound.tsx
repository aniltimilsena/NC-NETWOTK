import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import SEO from '../components/SEO';

export default function NotFound() {
  const navigate = useNavigate();

  const handleBack = () => {
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center px-4 font-sans select-none">
      <SEO title="404 — Page Not Found | NepalCasts" description="This page could not be found." noindex />

      <div className="flex flex-col items-center text-center max-w-md">
        <h1 className="text-7xl sm:text-8xl font-black tracking-tight text-white mb-3">
          404
        </h1>
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-2 tracking-tight">
          Page not found
        </h2>
        <p className="text-sm text-[#9ca3af] leading-normal font-normal mb-8 max-w-xs">
          The page you are looking for doesn’t exist or has been moved.
        </p>

        <div className="flex items-center gap-3">
          <button
            onClick={handleBack}
            type="button"
            className="px-5 py-2.5 rounded-xl bg-[#18181b] hover:bg-[#222226] border border-[#27272a] text-gray-300 hover:text-white font-medium text-sm transition-all cursor-pointer active:scale-95"
          >
            Go back
          </button>
          <Link
            to="/"
            className="px-5 py-2.5 rounded-xl bg-white hover:bg-gray-200 text-black font-semibold text-sm transition-all cursor-pointer active:scale-95 shadow-sm"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
