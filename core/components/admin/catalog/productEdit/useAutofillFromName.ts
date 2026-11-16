import PubSub from 'pubsub-js';
import React from 'react';
import { FORM_FIELD_UPDATED } from '../../../../lib/util/events';

// Lowercase, accents removed, everything else that isn't a letter or digit
// becomes "-": "Week 1 zomer 2027" -> "week-1-zomer-2027".
export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Value for a field that follows the product name (form field `name`) while
 * creating a product, e.g. the SKU or url key.
 *
 * - `enabled` false (edit page): returns `initial` and never changes it, so an
 *   existing product's SKU/url key is never rewritten.
 * - Once the user edits the field (call `onManualChange` from its onChange),
 *   it stops following the name.
 */
export function useAutofillFromName(
  enabled: boolean,
  initial: string | undefined
): [string | undefined, () => void] {
  const [value, setValue] = React.useState(initial);
  const touched = React.useRef(false);

  React.useEffect(() => {
    if (!enabled) {
      return undefined;
    }
    const token = PubSub.subscribe(
      FORM_FIELD_UPDATED,
      (_message: string, data: { name: string; value: unknown }) => {
        if (data.name === 'name' && !touched.current) {
          setValue(slugify(String(data.value ?? '')));
        }
      }
    );
    return () => {
      PubSub.unsubscribe(token);
    };
  }, [enabled]);

  const onManualChange = React.useCallback(() => {
    touched.current = true;
  }, []);

  return [value, onManualChange];
}
