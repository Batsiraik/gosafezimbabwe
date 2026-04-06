// Polyfills must run before React / expo-router load (e.g. WeakRef on Hermes).
import './polyfills';
import 'expo-router/entry';
