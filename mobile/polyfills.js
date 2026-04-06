/**
 * Hermes on some Android builds does not expose WeakRef / FinalizationRegistry (ES2021).
 * React 19 and other deps expect them — load this file BEFORE any React import.
 */
(function installWeakRefPolyfills() {
  const g =
    typeof globalThis !== 'undefined'
      ? globalThis
      : typeof global !== 'undefined'
        ? global
        : typeof self !== 'undefined'
          ? self
          : {};

  if (typeof g.WeakRef === 'undefined') {
    class WeakRefPoly {
      constructor(target) {
        if (target == null || (typeof target !== 'object' && typeof target !== 'function')) {
          throw new TypeError('WeakRef: invalid target');
        }
        this._target = target;
      }
      deref() {
        return this._target;
      }
    }
    g.WeakRef = WeakRefPoly;
  }

  if (typeof g.FinalizationRegistry === 'undefined') {
    class FinalizationRegistryPoly {
      // eslint-disable-next-line no-unused-vars
      constructor(cleanupCallback) {}
      register() {}
      unregister() {
        return undefined;
      }
    }
    g.FinalizationRegistry = FinalizationRegistryPoly;
  }

  if (typeof global !== 'undefined' && global !== g) {
    if (typeof global.WeakRef === 'undefined') global.WeakRef = g.WeakRef;
    if (typeof global.FinalizationRegistry === 'undefined')
      global.FinalizationRegistry = g.FinalizationRegistry;
  }
})();
