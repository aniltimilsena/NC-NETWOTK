

import React from 'react';
import { getCategoryConfig } from '../../constants/categories';

interface CategoryIconProps {
  /** Category name/id, e.g. "Actors", "Directors" */
  categoryId: string;
  /** Icon size in px (default 24) */
  size?: number;
  /** Whether to wrap the icon in a styled rounded bg pill */
  withBackground?: boolean;
  /** Extra class for the outer wrapper */
  className?: string;
}

export function CategoryIcon({
  categoryId,
  size = 24,
  withBackground = true,
  className = '',
}: CategoryIconProps) {
  const cat = getCategoryConfig(categoryId);
  const Icon = cat.icon;

  if (!withBackground) {
    return (
      <span style={{ color: cat.color }} className={className}>
        <Icon size={size} />
      </span>
    );
  }

  return (
    <div
      className={`inline-flex items-center justify-center rounded-2xl ${className}`}
      style={{
        background: cat.bgColor,
        color: cat.color,
        width: size + 20,
        height: size + 20,
        boxShadow: `0 0 15px ${cat.color}15`,
      }}
    >
      <Icon size={size} />
    </div>
  );
}

export default CategoryIcon;
