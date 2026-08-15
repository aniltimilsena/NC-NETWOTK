import React, { lazy } from 'react';
import { Route, useParams } from 'react-router-dom';

const TalentListing = lazy(() => import('../pages/TalentListing'));
const CastingCall = lazy(() => import('../features/casting/CastingCall'));
const Trending = lazy(() => import('../pages/Trending'));

const DiscoverWrapper = ({ onNavigate, user }: any) => {
  const { category } = useParams();
  return <TalentListing onNavigate={onNavigate} user={user} initialCategory={category || 'All'} initialMode={category ? 'talents' : 'categories'} />;
};

const TalentDirectoryWrapper = ({ onNavigate, user }: any) => {
  const { category } = useParams();
  return <TalentListing onNavigate={onNavigate} user={user} initialCategory={category || 'All'} initialMode="talents" />;
};

const SearchWrapper = ({ onNavigate, user, isAdmin }: any) => {
  const { type } = useParams();
  if (type === 'casting') {
    return <CastingCall onNavigate={onNavigate} user={user} isAdmin={isAdmin} />;
  }
  return <TalentListing onNavigate={onNavigate} user={user} initialCategory={type || 'All'} initialMode="talents" />;
};

export const DiscoverRoutes = ({ onNavigate, user, isAdmin }: any) => (
  <>
    <Route path="/discover" element={<DiscoverWrapper onNavigate={onNavigate} user={user} />} />
    <Route path="/discover/:category" element={<DiscoverWrapper onNavigate={onNavigate} user={user} />} />
    <Route path="/talents" element={<TalentDirectoryWrapper onNavigate={onNavigate} user={user} />} />
    <Route path="/talents/:category" element={<TalentDirectoryWrapper onNavigate={onNavigate} user={user} />} />
    <Route path="/trending" element={<Trending onNavigate={onNavigate} user={user} />} />

    {/* Search Routes */}
    <Route path="/search" element={<SearchWrapper onNavigate={onNavigate} user={user} isAdmin={isAdmin} />} />
    <Route path="/search/:type" element={<SearchWrapper onNavigate={onNavigate} user={user} isAdmin={isAdmin} />} />
  </>
);

