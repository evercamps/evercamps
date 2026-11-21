import { describe, expect, it } from '@jest/globals';
import {
  DEFAULT_SLIDER_INTERVAL,
  MAX_SLIDER_INTERVAL,
  parseInterval,
  parseSlides
} from '../../services/widget/parseImageSlider.js';

describe('parseSlides', () => {
  it('reads the JSON string the admin form saves', () => {
    const value = JSON.stringify([
      { url: '/assets/a.jpg', alt: 'Surfers', link: '/surfkampen' },
      { url: '/assets/b.jpg', alt: '', link: '' }
    ]);
    expect(parseSlides(value)).toEqual([
      { url: '/assets/a.jpg', alt: 'Surfers', link: '/surfkampen' },
      { url: '/assets/b.jpg', alt: '', link: '' }
    ]);
  });

  it('accepts an already parsed array', () => {
    expect(parseSlides([{ url: '/a.jpg' }])).toEqual([{ url: '/a.jpg', alt: '', link: '' }]);
  });

  it('drops slides without an image and ignores broken input', () => {
    expect(parseSlides([{ url: '' }, { alt: 'x' }, null, { url: '/a.jpg' }])).toHaveLength(1);
    expect(parseSlides('not json')).toEqual([]);
    expect(parseSlides(undefined)).toEqual([]);
    expect(parseSlides({ url: '/a.jpg' })).toEqual([]);
  });
});

describe('parseInterval', () => {
  it('defaults to 5 seconds and stays between 0 and 60', () => {
    expect(DEFAULT_SLIDER_INTERVAL).toBe(5);
    expect(MAX_SLIDER_INTERVAL).toBe(60);
    expect(parseInterval(undefined)).toBe(DEFAULT_SLIDER_INTERVAL);
    expect(parseInterval('abc')).toBe(DEFAULT_SLIDER_INTERVAL);
    expect(parseInterval('0')).toBe(0);
    expect(parseInterval('8')).toBe(8);
    expect(parseInterval(-3)).toBe(0);
    expect(parseInterval(500)).toBe(MAX_SLIDER_INTERVAL);
  });
});
