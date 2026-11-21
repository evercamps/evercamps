import type { ImageSlide } from '../../types/index.js';

export const DEFAULT_SLIDER_INTERVAL = 5;
export const MAX_SLIDER_INTERVAL = 60;

type RawSlide = { url?: unknown; alt?: unknown; link?: unknown } | null | undefined;

/**
 * Reads the slides the admin form saves (a JSON string, or an already parsed
 * array). Slides without an image are dropped; broken input gives no slides.
 */
export function parseSlides(value: unknown): ImageSlide[] {
  let list: unknown = value;
  if (typeof value === 'string') {
    try {
      list = JSON.parse(value);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(list)) {
    return [];
  }
  return (list as RawSlide[])
    .filter(
      (s): s is { url: string; alt?: unknown; link?: unknown } =>
        !!s && typeof s.url === 'string' && s.url.trim() !== ''
    )
    .map((s) => ({
      url: s.url.trim(),
      alt: typeof s.alt === 'string' ? s.alt : '',
      link: typeof s.link === 'string' ? s.link.trim() : ''
    }));
}

/** Seconds per image, between 0 (no autoplay) and MAX_SLIDER_INTERVAL */
export function parseInterval(value: unknown): number {
  const parsed = parseInt(String(value ?? ''), 10);
  if (Number.isNaN(parsed)) {
    return DEFAULT_SLIDER_INTERVAL;
  }
  return Math.min(Math.max(parsed, 0), MAX_SLIDER_INTERVAL);
}
