import React from 'react';
import {
  Wrench,
  Zap,
  Hammer,
  Sprout,
  Dog,
  Shield,
  Square,
  Phone,
  Monitor,
  Sparkles,
  Scissors,
  // Add more icons as needed
  type LucideIcon,
} from 'lucide-react';

// Map icon names (strings) to Lucide React icon components
const iconMap: Record<string, LucideIcon> = {
  Wrench,
  Zap,
  Hammer,
  Sprout,
  Dog,
  Shield,
  Square,
  Phone,
  Monitor,
  Sparkles,
  Scissors,
  // Add more mappings as needed
};

/**
 * Get an icon component by its name
 * @param iconName - The name of the icon (e.g., "Wrench", "Zap")
 * @param className - Optional className for the icon
 * @returns React component for the icon, or null if not found
 */
export function getServiceIcon(iconName: string, className: string = "w-6 h-6"): React.ReactNode {
  const IconComponent = iconMap[iconName];
  
  if (!IconComponent) {
    // Return a default icon if not found
    return <Square className={className} />;
  }
  
  return <IconComponent className={className} />;
}

/**
 * Get all available icon names (for admin panel dropdown)
 */
export function getAvailableIconNames(): string[] {
  return Object.keys(iconMap).sort();
}
