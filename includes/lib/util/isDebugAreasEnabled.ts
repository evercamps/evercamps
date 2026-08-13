import isDevelopmentMode from './isDevelopmentMode.js';

const STORAGE_KEY = 'evercamps:debug-areas';

const readStoredFlag = (): boolean => {
  try {
    return window.sessionStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
};

const writeStoredFlag = (enabled: boolean): void => {
  try {
    if (enabled) {
      window.sessionStorage.setItem(STORAGE_KEY, '1');
    } else {
      window.sessionStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // sessionStorage unavailable (e.g. locked-down privacy mode) - ignore
  }
};

export const isDebugAreasEnabled = (): boolean => {
  if (!isDevelopmentMode() || typeof window === 'undefined') {
    return false;
  }

  const param = new URLSearchParams(window.location.search).get('debug-areas');
  if (param === '1' || param === '0') {
    writeStoredFlag(param === '1');
    return param === '1';
  }

  return readStoredFlag();
};

export default isDebugAreasEnabled;
