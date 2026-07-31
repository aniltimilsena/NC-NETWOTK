import React, { lazy } from 'react';
import { Route, useParams } from 'react-router-dom';

const TalentListing = lazy(() => import('../pages/TalentListing'));
const CastingCall = lazy(() => import('../features/casting/CastingCall'));
const Trending = lazy(() => import('../pages/Trending'));

const TalentListingWrapper = ({ onNavigate }: any) => {
  const { category } = useParams();
  return <TalentListing onNavigate={onNavigate} initialCategory={category || 'All'} />;
};

const SearchWrapper = ({ onNavigate, user, isAdmin }: any) => {
  const { type } = useParams();
  if (type === 'casting') {
    return <CastingCall onNavigate={onNavigate} user={user} isAdmin={isAdmin} />;
  }
  return <TalentListing onNavigate={onNavigate} initialCategory={type || 'All'} />;
};

export const DiscoverRoutes = ({ onNavigate, user, isAdmin }: any) => (
  <>
    <Route path="/discover" element={<TalentListingWrapper onNavigate={onNavigate} />} />
    <Route path="/discover/:category" element={<TalentListingWrapper onNavigate={onNavigate} />} />
    <Route path="/talents" element={<TalentListingWrapper onNavigate={onNavigate} />} />
    <Route path="/talents/:category" element={<TalentListingWrapper onNavigate={onNavigate} />} />
    <Route path="/trending" element={<Trending onNavigate={onNavigate} />} />
    
    {/* Search Routes */}
    <Route path="/search" element={<SearchWrapper onNavigate={onNavigate} user={user} isAdmin={isAdmin} />} />
    <Route path="/search/:type" element={<SearchWrapper onNavigate={onNavigate} user={user} isAdmin={isAdmin} />} />
  </>
);
