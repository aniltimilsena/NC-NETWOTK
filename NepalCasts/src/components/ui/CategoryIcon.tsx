import React from 'react';
import { getCategoryConfig } from '../../constants/categories';
interface CategoryIconProps {
    categoryId: string;
    size?: number;
    withBackground?: boolean;
    className?: string;
}
export function CategoryIcon({ categoryId, size = 24, withBackground = true, className = '', }: CategoryIconProps) {
    const cat = getCategoryConfig(categoryId);
    const Icon = cat.icon;
    if (!withBackground) {
        return (<span style={{ color: cat.color }} className={className}>
        <Icon size={size}/>
      </span>);
    }
    return (<div className={`inline-flex items-center justify-center rounded-2xl ${className}`} style={{
            background: cat.bgColor,
            color: cat.color,
            width: size + 20,
            height: size + 20,
            boxShadow: `0 0 15px ${cat.color}15`,
        }}>
      <Icon size={size}/>
    </div>);
}
export default CategoryIcon;
