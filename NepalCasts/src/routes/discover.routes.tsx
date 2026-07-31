import React, { lazy } from 'react';
import { Route, useParams } from 'react-router-dom';

const TalentListing = lazy(() => import('../pages/TalentListing'));
const Trending = lazy(() => import('../pages/Trending'));

const TalentListingWrapper = ({ onNavigate }: any) => {
  const { category } = useParams();
  return <TalentListing onNavigate={onNavigate} initialCategory={category || 'All'} />;
};

export const DiscoverRoutes = ({ onNavigate }: any) => (
  <>
    <Route path="/discover" element={<TalentListingWrapper onNavigate={onNavigate} />} />
    <Route path="/discover/:category" element={<TalentListingWrapper onNavigate={onNavigate} />} />
    <Route path="/talents" element={<TalentListingWrapper onNavigate={onNavigate} />} />
    <Route path="/talents/:category" element={<TalentListingWrapper onNavigate={onNavigate} />} />
    <Route path="/trending" element={<Trending onNavigate={onNavigate} />} />
  </>
);
