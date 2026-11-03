import React from 'react';

export const HOME_CATEGORY_CARDS = [
  {
    id: 'actor',
    filter: 'actor',
    label: 'Actor',
    bgColor: '#FFFFFF',
    accentColor: '#194332',
    borderColor: '#E7E5E0',
    glowColor: 'rgba(25, 67, 50, 0.06)',
    iconType: 'masks',
  },
  {
    id: 'director',
    filter: 'director',
    label: 'Director',
    bgColor: '#FFFFFF',
    accentColor: '#194332',
    borderColor: '#E7E5E0',
    glowColor: 'rgba(25, 67, 50, 0.06)',
    iconType: 'director',
  },
  {
    id: 'writer',
    filter: 'writer',
    label: 'Script\nWriter',
    bgColor: '#FFFFFF',
    accentColor: '#194332',
    borderColor: '#E7E5E0',
    glowColor: 'rgba(25, 67, 50, 0.06)',
    iconType: 'script',
  },
  {
    id: 'dop',
    filter: 'dop',
    label: 'DOP\nCinematographer',
    bgColor: '#FFFFFF',
    accentColor: '#194332',
    borderColor: '#E7E5E0',
    glowColor: 'rgba(25, 67, 50, 0.06)',
    iconType: 'dop',
  },
  {
    id: 'model',
    filter: 'model',
    label: 'Model',
    bgColor: '#FFFFFF',
    accentColor: '#194332',
    borderColor: '#E7E5E0',
    glowColor: 'rgba(25, 67, 50, 0.06)',
    iconType: 'model',
  },
  {
    id: 'musician',
    filter: 'musician',
    label: 'Song writer/\nSinger',
    bgColor: '#FFFFFF',
    accentColor: '#194332',
    borderColor: '#E7E5E0',
    glowColor: 'rgba(25, 67, 50, 0.06)',
    iconType: 'musician',
  },
  {
    id: 'vfx',
    filter: 'vfx',
    label: 'Editor/\nVFX',
    bgColor: '#FFFFFF',
    accentColor: '#194332',
    borderColor: '#E7E5E0',
    glowColor: 'rgba(25, 67, 50, 0.06)',
    iconType: 'vfx',
  },
  {
    id: 'producer',
    filter: 'producer',
    label: 'Producer\nmanager',
    bgColor: '#FFFFFF',
    accentColor: '#194332',
    borderColor: '#E7E5E0',
    glowColor: 'rgba(25, 67, 50, 0.06)',
    iconType: 'producer',
  },
];

export function CategoryCardIcon({ type, color = "#194332", className = "w-8 h-8 sm:w-10 sm:h-10 fill-current text-[#194332]" }) {
  const style = color ? { color } : undefined;

  if (type === 'masks') {
    return (
      <svg className={className} style={style} viewBox="0 0 24 24">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-5 8c.83 0 1.5.67 1.5 1.5S7.83 13 7 13s-1.5-.67-1.5-1.5S6.17 10 7 10zm10 0c.83 0 1.5.67 1.5 1.5S17.83 13 17 13s-1.5-.67-1.5-1.5.67-1.5 1.5-1.5zm-5 8.5c-2.33 0-4.31-1.46-5.11-3.5h10.22c-.8 2.04-2.78 3.5-5.11 3.5z" />
      </svg>
    );
  }
  if (type === 'director') {
    return (
      <svg className={className} style={style} viewBox="0 0 24 24">
        <path d="M4 3h16v2H4V3zm1 3h14l-1 5H6L5 6zm-1 6h16l-2 9H6l-2-9zm4 2l1 5h6l1-5H8z" />
        <path d="M18 3l3-2v5l-3-2z" />
      </svg>
    );
  }
  if (type === 'script') {
    return (
      <svg className={className} style={style} viewBox="0 0 24 24">
        <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
        <path d="M9 10h2v2H9v-2z" />
      </svg>
    );
  }
  if (type === 'dop') {
    return (
      <svg className={className} style={style} viewBox="0 0 24 24">
        <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" />
      </svg>
    );
  }
  if (type === 'model') {
    return (
      <svg className={className} style={style} viewBox="0 0 24 24">
        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
      </svg>
    );
  }
  if (type === 'musician') {
    return (
      <svg className={className} style={style} viewBox="0 0 24 24">
        <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
      </svg>
    );
  }
  if (type === 'vfx') {
    return (
      <svg className={className} style={style} viewBox="0 0 24 24">
        <path d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z" />
      </svg>
    );
  }
  if (type === 'producer') {
    return (
      <svg className={className} style={style} viewBox="0 0 24 24">
        <path d="M20 6h-4V4c0-1.11-.89-2-2-2h-4c-1.11 0-2 .89-2 2v2H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-6 0h-4V4h4v2z" />
      </svg>
    );
  }
  return null;
}
