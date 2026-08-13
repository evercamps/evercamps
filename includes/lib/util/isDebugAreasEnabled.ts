import isDevelopmentMode from './isDevelopmentMode.js';

export const isDebugAreasEnabled = (): boolean => {
  if (!isDevelopmentMode() || typeof window === 'undefined') {
    return false;
  }
  return new URLSearchParams(window.location.search).get('debug-areas') === '1';
};

export default isDebugAreasEnabled;
