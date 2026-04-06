/**
 * SVG icons for dashboard – always visible (no font required).
 * Colors: use "white" for header, "#ffe200" for wheel, etc.
 */
import React from 'react';
import Svg, { Path, Circle } from 'react-native-svg';

const size = 24;
const viewBox = `0 0 ${size} ${size}`;

export function IconBell({ color = '#fff', size: s = 24 }: { color?: string; size?: number }) {
  return (
    <Svg width={s} height={s} viewBox={viewBox} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <Path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </Svg>
  );
}

export function IconClock({ color = '#fff', size: s = 24 }: { color?: string; size?: number }) {
  return (
    <Svg width={s} height={s} viewBox={viewBox} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx="12" cy="12" r="10" />
      <Path d="M12 6v6l4 2" />
    </Svg>
  );
}

export function IconSettings({ color = '#fff', size: s = 24 }: { color?: string; size?: number }) {
  return (
    <Svg width={s} height={s} viewBox={viewBox} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx="12" cy="12" r="3" />
      <Path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </Svg>
  );
}

export function IconLogOut({ color = '#fff', size: s = 24 }: { color?: string; size?: number }) {
  return (
    <Svg width={s} height={s} viewBox={viewBox} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <Path d="M16 17l5-5-5-5" />
      <Path d="M21 12H9" />
    </Svg>
  );
}

export function IconArrowBack({ color = '#fff', size: s = 24 }: { color?: string; size?: number }) {
  return (
    <Svg width={s} height={s} viewBox={viewBox} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M19 12H5" />
      <Path d="M12 19l-7-7 7-7" />
    </Svg>
  );
}

export function IconPackage({ color = '#fff', size: s = 32 }: { color?: string; size?: number }) {
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M16.5 9.4l-9-5.19M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
      <Path d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12" />
    </Svg>
  );
}

export function IconDocument({ color = '#fff', size: s = 24 }: { color?: string; size?: number }) {
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <Path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
    </Svg>
  );
}

export function IconCloudUpload({ color = '#fff', size: s = 24 }: { color?: string; size?: number }) {
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <Path d="M17 8l-5-5-5 5" />
      <Path d="M12 3v12" />
    </Svg>
  );
}

export function IconCheckmarkCircle({ color = '#fff', size: s = 24 }: { color?: string; size?: number }) {
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx="12" cy="12" r="10" />
      <Path d="M9 12l2 2 4-4" />
    </Svg>
  );
}

export function IconWarning({ color = '#facc15', size: s = 24 }: { color?: string; size?: number }) {
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <Path d="M12 9v4M12 17h.01" />
    </Svg>
  );
}

export function IconCar({ color = '#ffe200', size: s = 32 }: { color?: string; size?: number }) {
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      {/* Small car side view: body, cabin, two wheels */}
      <Path d="M5 12h14l-1.5-4h-11L5 12z" />
      <Path d="M5 12v5h14v-5" />
      <Path d="M8 10.5h8v2H8z" />
      <Circle cx="7.5" cy="17" r="2.2" fill="none" stroke={color} strokeWidth={1.8} />
      <Circle cx="16.5" cy="17" r="2.2" fill="none" stroke={color} strokeWidth={1.8} />
    </Svg>
  );
}

export function IconBicycle({ color = '#ffe200', size: s = 32 }: { color?: string; size?: number }) {
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx="5.5" cy="17.5" r="3.5" />
      <Circle cx="18.5" cy="17.5" r="3.5" />
      <Path d="M15 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2z" />
      <Path d="m12 17.5 4-5 4 2.5" />
      <Path d="m4 14 4.5-5 4 2.5" />
    </Svg>
  );
}

export function IconLocation({ color = '#ffe200', size: s = 32 }: { color?: string; size?: number }) {
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <Circle cx="12" cy="10" r="3" />
    </Svg>
  );
}

export function IconWrench({ color = '#ffe200', size: s = 32 }: { color?: string; size?: number }) {
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </Svg>
  );
}

export function IconBus({ color = '#ffe200', size: s = 32 }: { color?: string; size?: number }) {
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M8 6v6" />
      <Path d="M15 6v6" />
      <Path d="M2 12h19.6" />
      <Path d="M18 18h3s.5-1.7.8-2.8c.2-.6.2-1.2 0-1.8-.3-1.1-.8-2.8-.8-2.8L21 10" />
      <Path d="M3 10l.8 2.4c0 .6.2 1.2 0 1.8C3.5 14.3 3 16 3 16H1" />
      <Path d="M21 10V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v4" />
      <Path d="M5 18h14" />
      <Path d="M7 18v2" />
      <Path d="M17 18v2" />
    </Svg>
  );
}

export function IconBriefcase({ color = '#fff', size: s = 24 }: { color?: string; size?: number }) {
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
      <Path d="M20 8H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2z" />
      <Path d="M12 12v4" />
      <Path d="M12 8v0" />
    </Svg>
  );
}

export function IconWhatsApp({ color = '#fff', size: s = 32 }: { color?: string; size?: number }) {
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24" fill={color}>
      <Path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .96 4.534.96 10.08c0 1.792.413 3.53 1.2 5.079L0 24l8.94-2.141a11.88 11.88 0 003.11.411h.001c5.554 0 10.089-4.534 10.089-10.088 0-2.688-1.05-5.216-2.956-7.12z" />
    </Svg>
  );
}

export function IconPerson({ color = '#fff', size: s = 24 }: { color?: string; size?: number }) {
  return (
    <Svg width={s} height={s} viewBox={viewBox} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx="12" cy="8" r="4" />
      <Path d="M20 21a8 8 0 1 0-16 0" />
    </Svg>
  );
}

export function IconCalendar({ color = '#fff', size: s = 24 }: { color?: string; size?: number }) {
  return (
    <Svg width={s} height={s} viewBox={viewBox} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
      <Path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01" />
    </Svg>
  );
}

export function IconPower({ color = '#fff', size: s = 24 }: { color?: string; size?: number }) {
  return (
    <Svg width={s} height={s} viewBox={viewBox} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
      <Path d="M12 2v10" />
    </Svg>
  );
}

export function IconStar({ color = '#fff', size: s = 24 }: { color?: string; size?: number }) {
  return (
    <Svg width={s} height={s} viewBox={viewBox} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </Svg>
  );
}

export function IconNavigate({ color = '#fff', size: s = 24 }: { color?: string; size?: number }) {
  return (
    <Svg width={s} height={s} viewBox={viewBox} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M2 12h20M12 2v20M2 12l10-10 10 10" />
    </Svg>
  );
}

export function IconCloseCircle({ color = '#fff', size: s = 24 }: { color?: string; size?: number }) {
  return (
    <Svg width={s} height={s} viewBox={viewBox} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx="12" cy="12" r="10" />
      <Path d="M15 9l-6 6M9 9l6 6" />
    </Svg>
  );
}

export function IconCall({ color = '#fff', size: s = 24 }: { color?: string; size?: number }) {
  return (
    <Svg width={s} height={s} viewBox={viewBox} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </Svg>
  );
}

export function IconAddCircle({ color = '#fff', size: s = 24 }: { color?: string; size?: number }) {
  return (
    <Svg width={s} height={s} viewBox={viewBox} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx="12" cy="12" r="10" />
      <Path d="M12 8v8M8 12h8" />
    </Svg>
  );
}

export function IconGrid({ color = '#fff', size: s = 24 }: { color?: string; size?: number }) {
  return (
    <Svg width={s} height={s} viewBox={viewBox} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z" />
    </Svg>
  );
}

export function IconCamera({ color = '#fff', size: s = 24 }: { color?: string; size?: number }) {
  return (
    <Svg width={s} height={s} viewBox={viewBox} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <Circle cx="12" cy="13" r="4" />
    </Svg>
  );
}

export function IconTrash({ color = '#fff', size: s = 24 }: { color?: string; size?: number }) {
  return (
    <Svg width={s} height={s} viewBox={viewBox} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <Path d="M10 11v6M14 11v6" />
    </Svg>
  );
}

export function IconChevronDown({ color = '#fff', size: s = 24 }: { color?: string; size?: number }) {
  return (
    <Svg width={s} height={s} viewBox={viewBox} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M6 9l6 6 6-6" />
    </Svg>
  );
}

export function IconMinus({ color = '#fff', size: s = 24 }: { color?: string; size?: number }) {
  return (
    <Svg width={s} height={s} viewBox={viewBox} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M5 12h14" />
    </Svg>
  );
}

export function IconPlus({ color = '#fff', size: s = 24 }: { color?: string; size?: number }) {
  return (
    <Svg width={s} height={s} viewBox={viewBox} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 5v14M5 12h14" />
    </Svg>
  );
}

export function IconSearch({ color = '#fff', size: s = 24 }: { color?: string; size?: number }) {
  return (
    <Svg width={s} height={s} viewBox={viewBox} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx="11" cy="11" r="8" />
      <Path d="M21 21l-4.35-4.35" />
    </Svg>
  );
}

export function IconDollar({ color = '#fff', size: s = 24 }: { color?: string; size?: number }) {
  return (
    <Svg width={s} height={s} viewBox={viewBox} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </Svg>
  );
}

export function IconMap({ color = '#fff', size: s = 24 }: { color?: string; size?: number }) {
  return (
    <Svg width={s} height={s} viewBox={viewBox} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M1 6v15l7-4 7 4 7-4V2l-7 4-7-4-7 4z" />
      <Path d="M8 2v15M16 6v15" />
    </Svg>
  );
}

export function IconSync({ color = '#fff', size: s = 24 }: { color?: string; size?: number }) {
  return (
    <Svg width={s} height={s} viewBox={viewBox} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8.5M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 15.5" />
    </Svg>
  );
}

export function IconCheck({ color = '#fff', size: s = 24 }: { color?: string; size?: number }) {
  return (
    <Svg width={s} height={s} viewBox={viewBox} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M5 12l5 5L20 7" />
    </Svg>
  );
}

export function IconPhone({ color = '#fff', size: s = 24 }: { color?: string; size?: number }) {
  return (
    <Svg width={s} height={s} viewBox={viewBox} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </Svg>
  );
}

const wheelIcons = {
  car: IconCar,
  bicycle: IconBicycle,
  location: IconLocation,
  construct: IconWrench,
  bus: IconBus,
} as const;

export function WheelIcon({ name, color = '#ffe200', size: s = 32 }: { name: keyof typeof wheelIcons; color?: string; size?: number }) {
  const Icon = wheelIcons[name] || IconCar;
  return <Icon color={color} size={s} />;
}
