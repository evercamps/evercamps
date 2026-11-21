import { parseInterval, parseSlides } from '../../../../services/widget/parseImageSlider.js';
import type { ImageSliderWidget } from '../../../../types/index.js';

export default {
  Query: {
    imageSliderWidget: (
      _: unknown,
      { settings }: { settings?: Record<string, unknown> | null }
    ): ImageSliderWidget => ({
      slides: parseSlides(settings?.slides),
      interval: parseInterval(settings?.interval),
      className: typeof settings?.className === 'string' ? settings.className : ''
    })
  }
};
