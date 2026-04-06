import { router } from 'expo-router';

/**
 * Go back if there is history; otherwise replace to the fallback route.
 * Use this for back buttons to avoid "GO_BACK was not handled" when the stack is empty.
 */
export function safeBack(fallbackPath: string): void {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace(fallbackPath as '/');
  }
}
