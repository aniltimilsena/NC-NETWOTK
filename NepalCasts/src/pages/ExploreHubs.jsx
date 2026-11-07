import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import RegionalFilmHubs from '../components/ui/RegionalFilmHubs';
import SEO from '../components/SEO';

export default function ExploreHubs({ onNavigate }) {
  const { provinceId } = useParams();
  const navigate = useNavigate();

  const handleNav = (page, param) => {
    if (page === 'back') {
      if (window.history.length > 1) {
        navigate(-1);
      } else {
        navigate('/');
      }
    } else if (onNavigate) {
      onNavigate(page, param);
    } else {
      if (page === 'listing') navigate('/talents');
      else if (page === 'casting') navigate('/casting');
      else navigate('/');
    }
  };

  return (
    <>
      <SEO
        title="Explore Regional Cinema Hubs of Nepal | NepalCasts"
        description="Discover filming locations, regional talent ecosystems, and cinema heritage across all 7 provinces of Nepal on NepalCasts."
      />
      <RegionalFilmHubs
        onNavigate={handleNav}
        defaultProvinceId={provinceId || 'koshi'}
        standalone={true}
      />
    </>
  );
}

