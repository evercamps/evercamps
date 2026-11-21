function isPlainObject(value) {
  return (
    value !== null &&
    typeof value === 'object' &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

/**
 * Deep-merges a theme's Tailwind config on top of the default one, returning
 * a new object (neither input is changed). Nested objects such as
 * `theme.extend.colors` are merged key by key; anything else, including
 * arrays and functions, is replaced by the theme's value.
 */
export function mergeTailwindConfig(base = {}, override = {}) {
  const result = { ...base };
  Object.entries(override || {}).forEach(([key, value]) => {
    if (isPlainObject(value) && isPlainObject(result[key])) {
      result[key] = mergeTailwindConfig(result[key], value);
    } else {
      result[key] = value;
    }
  });
  return result;
}
