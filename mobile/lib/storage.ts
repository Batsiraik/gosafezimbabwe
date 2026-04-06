/**
 * Persist token, user, temp_phone – same keys as Next.js (nexryde_token, nexryde_user, temp_phone)
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'nexryde_token';
const USER_KEY = 'nexryde_user';
const TEMP_PHONE_KEY = 'temp_phone';
const MODE_KEY = 'gosafe_user_mode';

export async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function setToken(token: string): Promise<void> {
  await AsyncStorage.setItem(TOKEN_KEY, token);
}

export async function getUser(): Promise<Record<string, unknown> | null> {
  const raw = await AsyncStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function setUser(user: Record<string, unknown>): Promise<void> {
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
}

export async function clearAuth(): Promise<void> {
  await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
}

/** Clear all app storage (token, user, cache, etc.). Frees space so login can succeed after "disk full". Logs user out. */
export async function clearAllAppStorage(): Promise<void> {
  await AsyncStorage.clear();
}

export async function getTempPhone(): Promise<string | null> {
  return AsyncStorage.getItem(TEMP_PHONE_KEY);
}

export async function setTempPhone(phone: string): Promise<void> {
  await AsyncStorage.setItem(TEMP_PHONE_KEY, phone);
}

export async function removeTempPhone(): Promise<void> {
  await AsyncStorage.removeItem(TEMP_PHONE_KEY);
}

export type UserMode = 'user' | 'taxi' | 'parcel' | 'home-services' | 'bus';
const VALID_MODES: UserMode[] = ['user', 'taxi', 'parcel', 'home-services', 'bus'];

export async function getUserMode(): Promise<UserMode> {
  const stored = await AsyncStorage.getItem(MODE_KEY);
  if (stored && VALID_MODES.includes(stored as UserMode)) return stored as UserMode;
  return 'user';
}

export async function setUserMode(mode: UserMode): Promise<void> {
  await AsyncStorage.setItem(MODE_KEY, mode);
}

export async function clearUserMode(): Promise<void> {
  await AsyncStorage.removeItem(MODE_KEY);
}

export function getDashboardRoute(mode: UserMode): string {
  switch (mode) {
    case 'taxi': return '/driver/taxi/dashboard';
    case 'parcel': return '/driver/parcel/dashboard';
    case 'home-services': return '/driver/home-services/dashboard';
    case 'bus': return '/driver/bus/dashboard';
    default: return '/dashboard';
  }
}
