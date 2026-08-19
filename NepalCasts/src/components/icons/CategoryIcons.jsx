import {
  Clapperboard,
  Camera,
  Video,
  Music,
  Mic2,
  Wand2,
  Feather,
  Briefcase,
  Film,
} from 'lucide-react';

// Custom professional SVG icon for Dancer matching Lucide's 1.5px stroke aesthetic
export const DancerIcon = ({ size = 24, className, strokeWidth = 1.5, ...rest }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...rest}
  >
    <circle cx="15" cy="4" r="2" />
    <path d="M7 6.5c3 1.5 5 1.5 7.5.5" />
    <path d="M14.5 7L12 13" />
    <path d="M12 13L8 20" />
    <path d="M12 13l5.5 7" />
    <path d="M6 12c3-1 6.5-2 9-5.5" />
  </svg>
);

export const SpotlightIcon = Clapperboard;
export const ApertureIcon = Camera;
export const FilmReelIcon = Video;
export const DynamicMotionIcon = DancerIcon;
export const EqualizerIcon = Music;
export const HeadphonesIcon = Mic2;
export const StackedLayersIcon = Wand2;
export const OpenBookIcon = Feather;

export const CATEGORY_ICON_MAP = {
  actor: Clapperboard,
  director: Video,
  writer: Feather,
  dop: Camera,
  model: Camera,
  musician: Music,
  vfx: Wand2,
  producer: Briefcase,
  dancer: DancerIcon,
  voiceover: Mic2,
};
