/**
 * Service icons for Home Services – same names as admin panel (backend iconName).
 * All icons are SVG so they render without font loading.
 */
import React from 'react';
import Svg, { Path, Circle } from 'react-native-svg';

const viewBox = '0 0 24 24';

type IconProps = { color?: string; size?: number };
const defaultColor = 'rgba(255,255,255,0.9)';

function makeIcon(paths: string[], extra?: React.ReactNode) {
  return function ServiceIcon({ color = defaultColor, size: s = 24 }: IconProps) {
    return (
      <Svg width={s} height={s} viewBox={viewBox} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        {paths.map((d, i) => (
          <Path key={i} d={d} />
        ))}
        {extra}
      </Svg>
    );
  };
}

// Wrench (default)
const IconWrench = makeIcon(['M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z']);
const IconZap = makeIcon(['M13 2L3 14h9l-1 8 10-12h-9l1-8z']);
const IconHammer = makeIcon(['M15 12l-8.5 8.5c-.83.83-2.17.83-3 0 0 0 0 0 0 0a2.12 2.12 0 0 1 0-3L12 9', 'M17.64 15L22 10.64']);
const IconSprout = makeIcon(['M7 20h10', 'M10 20c5.5-2.5.8-6.4 3-10', 'M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z', 'M14.1 6a7 7 0 0 0-4.1 6c0 1.2.3 2.4 1 3.5 2.5-2.3 3.4-5.1 2.9-7.9-1.2-2.6-3.9-4.2-6.9-4.2']);
const IconDog = makeIcon(['M10 5.172C10 3.782 8.423 2.679 6.5 3c-2.823.47-4.113 6.006-4 7 .08.703 1.725 1.726 5 1.996', 'M12 5.172C14 3.782 15.577 2.679 17.5 3c2.823.47 4.113 6.006 4 7-.08.703-1.725 1.726-5 1.996', 'M12 8v12', 'M8 20l4-4', 'M16 20l-4-4']);
const IconShield = makeIcon(['M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z']);
const IconSquare = makeIcon(['M3 3h18v18H3z']);
const IconPhone = makeIcon(['M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z']);
const IconMonitor = makeIcon(['M4 4h16v12H4z', 'M12 20v-4']);
const IconSparkles = makeIcon(['M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z', 'M5 14l1 3 3-1-1-3-3 1z', 'M19 14l1 3 3-1-1-3-3 1z']);
const IconScissors = makeIcon(['M6 9c0 1.66 1.34 3 3 3s3-1.34 3-3-1.34-3-3-3-3 1.34-3 3z', 'M6 15c0 1.66 1.34 3 3 3s3-1.34 3-3-1.34-3-3-3-3 1.34-3 3z', 'M20 4L8.12 15.88', 'M14.47 14.48L20 20', 'M8.12 8.12L12 12']);
const IconHome = makeIcon(['M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z'], <Path d="M9 22V12h6v10" />);
const IconCar = makeIcon(['M5 17h14v-5H5v5z', 'M5 12l2-4h10l2 4', 'M7 8h.01', 'M17 8h.01']);
const IconBike = makeIcon(['M5.5 17H4a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1h1.5', 'M18 17h1.5a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1H18', 'M12 17v-4', 'M6 8l3-3 3 3 4-4']);
const IconBuilding = makeIcon(['M6 2v20', 'M18 2v20', 'M6 9h12', 'M6 14h12', 'M6 19h12']);
const IconPaintbrush = makeIcon(['M18.37 2.63L14 7l-1.59-1.59a2 2 0 0 0-2.82 0L8 7l9 9 1.59-1.59a2 2 0 0 0 0-2.82L17 10l4.37-4.37a2.12 2.12 0 1 0-3-3z', 'M9 8l-4 4']);
const IconDroplet = makeIcon(['M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3.5-5.5S12 3.5 12 2c0 1.5-2.5 3.5-5 5S5 13 5 15a7 7 0 0 0 7 7z']);
const IconFlame = makeIcon(['M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z']);
const IconWind = makeIcon(['M9.59 4.59A2 2 0 1 1 11 8H2', 'M12 2v2', 'M12 20v2', 'M4 12H2', 'M20 12h2', 'M4 18H2', 'M20 18h2']);
const IconSun = makeIcon(['M12 2v2', 'M12 20v2', 'M4.93 4.93l1.41 1.41', 'M17.66 17.66l1.41 1.41', 'M2 12h2', 'M20 12h2', 'M6.34 17.66l-1.41 1.41', 'M19.07 4.93l-1.41 1.41'], <Circle cx="12" cy="12" r="4" />);
const IconMoon = makeIcon(['M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z']);
const IconStar = makeIcon(['M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z']);
const IconHeart = makeIcon(['M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z']);
const IconMusic = makeIcon(['M9 18V5l12-2v13', 'M9 9l12-2']);
const IconCamera = makeIcon(['M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z'], <Circle cx="12" cy="13" r="4" />);
const IconGamepad2 = makeIcon(['M6 12h4', 'M8 10v4', 'M15 13h.01', 'M18 11h.01', 'M17 16H7a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2z']);
const IconBook = makeIcon(['M4 19.5A2.5 2.5 0 0 1 6.5 17H20', 'M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z'], <Path d="M8 7h8M8 11h8" />);
const IconGraduationCap = makeIcon(['M22 10v6M2 10l10-5 10 5-10 5z'], <Path d="M6 12v5c3 3 9 3 12 0v-5" />);
const IconBriefcase = makeIcon(['M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16', 'M20 8H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2z'], <Path d="M12 12v4M12 8v0" />);
const IconShoppingBag = makeIcon(['M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z', 'M3 6h18', 'M16 10a4 4 0 0 1-8 0']);
const IconUtensils = makeIcon(['M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2', 'M7 2v20', 'M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7']);
const IconCoffee = makeIcon(['M18 8h1a4 4 0 0 1 0 8h-1', 'M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4z', 'M6 1v3', 'M10 1v3', 'M14 1v3']);
const IconDumbbell = makeIcon(['M6.5 6.5h11', 'M6.5 17.5h11', 'M12 6.5v11', 'M3 9.5v5', 'M21 9.5v5', 'M5 12h2', 'M17 12h2']);
const IconStethoscope = makeIcon(['M11 2v2', 'M5 2v2', 'M5 3H4a2 2 0 0 0-2 2v4a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V5a2 2 0 0 0-2-2h-1', 'M11 8h2', 'M11 12h2']);
const IconPill = makeIcon(['M10.5 20H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h4.5', 'M12 8v8', 'M17.5 20H20a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2.5', 'M12 2v2', 'M12 14v2']);
const IconBaby = makeIcon(['M9 12h.01', 'M15 12h.01', 'M10 16c.5.3 1.2.5 2 .5s1.5-.2 2-.5', 'M19 6.3a10 10 0 0 1-4.2 2.6', 'M21 6.3a10 10 0 0 0-4.2 2.6']);
const IconShirt = makeIcon(['M20.38 3.46L16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z']);
const IconPalette = makeIcon(['M12 2a10 10 0 0 1 10 10c0 5.5-4 8-6 8s-2.5-2-2.5-4c0-2 1.5-3 3-3h.5c0-2-1.5-3-2.5-3s-2 1-2 2c0 1 0 2 1 2.5 0 2.5 0 5-5 5a10 10 0 0 1-10-10C2 6.48 6.48 2 12 2z']);
const IconBrush = makeIcon(['M9.06 11.9l4.04-4.04a2.06 2.06 0 1 1 2.91 2.91l-4.04 4.04', 'M7.5 14.5C5.5 12.5 4 11 4 9a3 3 0 0 1 6 0c0 2-1.5 3.5-3.5 5.5']);

const serviceIconMap: Record<string, React.ComponentType<IconProps>> = {
  Wrench: IconWrench,
  Zap: IconZap,
  Hammer: IconHammer,
  Sprout: IconSprout,
  Dog: IconDog,
  Shield: IconShield,
  Square: IconSquare,
  Phone: IconPhone,
  Monitor: IconMonitor,
  Sparkles: IconSparkles,
  Scissors: IconScissors,
  Home: IconHome,
  Car: IconCar,
  Bike: IconBike,
  Building: IconBuilding,
  Paintbrush: IconPaintbrush,
  Droplet: IconDroplet,
  Flame: IconFlame,
  Wind: IconWind,
  Sun: IconSun,
  Moon: IconMoon,
  Star: IconStar,
  Heart: IconHeart,
  Music: IconMusic,
  Camera: IconCamera,
  Gamepad2: IconGamepad2,
  Book: IconBook,
  GraduationCap: IconGraduationCap,
  Briefcase: IconBriefcase,
  ShoppingBag: IconShoppingBag,
  Utensils: IconUtensils,
  Coffee: IconCoffee,
  Dumbbell: IconDumbbell,
  Stethoscope: IconStethoscope,
  Pill: IconPill,
  Baby: IconBaby,
  Shirt: IconShirt,
  Palette: IconPalette,
  Brush: IconBrush,
};

export function getServiceIcon(
  iconName: string | undefined,
  size: number = 24,
  color: string = defaultColor
): React.ReactNode {
  const name = iconName && serviceIconMap[iconName] ? iconName : 'Wrench';
  const Icon = serviceIconMap[name] ?? IconWrench;
  return <Icon color={color} size={size} />;
}
