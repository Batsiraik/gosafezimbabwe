/**
 * User Mode Management
 * Stores and retrieves the current user mode (user vs service provider type)
 */

export type UserMode = 'user' | 'taxi' | 'parcel' | 'home-services' | 'bus';

const MODE_STORAGE_KEY = 'gosafe_user_mode';

/**
 * Get the current user mode from localStorage
 */
export function getUserMode(): UserMode {
  if (typeof window === 'undefined') return 'user';
  
  const stored = localStorage.getItem(MODE_STORAGE_KEY);
  if (stored && ['user', 'taxi', 'parcel', 'home-services', 'bus'].includes(stored)) {
    return stored as UserMode;
  }
  return 'user'; // Default to user mode
}

/**
 * Set the current user mode
 */
export function setUserMode(mode: UserMode): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(MODE_STORAGE_KEY, mode);
}

/**
 * Clear the user mode (switch back to user)
 */
export function clearUserMode(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(MODE_STORAGE_KEY);
}

/**
 * Get the dashboard route for the current mode
 */
export function getDashboardRoute(mode: UserMode): string {
  switch (mode) {
    case 'taxi':
      return '/driver/taxi/dashboard';
    case 'parcel':
      return '/driver/parcel/dashboard';
    case 'home-services':
      return '/driver/home-services/dashboard';
    case 'bus':
      return '/driver/bus/dashboard';
    case 'user':
    default:
      return '/dashboard';
  }
}
