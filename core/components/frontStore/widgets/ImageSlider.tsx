import React from 'react';
import type { ImageSlide, ImageSliderWidget } from '../../../modules/cms/types/index.js';
import './ImageSlider.scss';

interface SlideProps {
  slide: ImageSlide;
  active: boolean;
}

function Slide({ slide, active }: SlideProps) {
  const image = (
    <img src={slide.url} alt={slide.alt || ''} loading={active ? 'eager' : 'lazy'} />
  );
  return (
    <div className={`image-slider__slide ${active ? 'is-active' : ''}`} aria-hidden={!active}>
      {slide.link ? (
        <a href={slide.link} tabIndex={active ? 0 : -1}>
          {image}
        </a>
      ) : (
        image
      )}
    </div>
  );
}

interface ImageSliderProps {
  imageSliderWidget?: ImageSliderWidget | null;
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export default function ImageSlider({ imageSliderWidget }: ImageSliderProps) {
  const { slides = [], interval = 5, className = '' } = imageSliderWidget || {};
  const [current, setCurrent] = React.useState(0);
  const [paused, setPaused] = React.useState(false);
  const count = slides.length;

  React.useEffect(() => {
    if (count < 2 || !interval || paused || prefersReducedMotion()) {
      return undefined;
    }
    const timer = setInterval(() => {
      setCurrent((c) => (c + 1) % count);
    }, interval * 1000);
    return () => clearInterval(timer);
  }, [count, interval, paused]);

  if (count === 0) {
    return null;
  }

  return (
    <section
      className={`image-slider ${className}`}
      aria-roledescription="carousel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="image-slider__track">
        {slides.map((slide, index) => (
          // eslint-disable-next-line react/no-array-index-key
          <Slide key={index} slide={slide} active={index === current} />
        ))}
      </div>
      {count > 1 && (
        <>
          <button
            type="button"
            className="image-slider__arrow image-slider__arrow--prev"
            aria-label="Previous"
            onClick={() => setCurrent((current - 1 + count) % count)}
          >
            ‹
          </button>
          <button
            type="button"
            className="image-slider__arrow image-slider__arrow--next"
            aria-label="Next"
            onClick={() => setCurrent((current + 1) % count)}
          >
            ›
          </button>
          <div className="image-slider__dots">
            {slides.map((slide, index) => (
              <button
                // eslint-disable-next-line react/no-array-index-key
                key={index}
                type="button"
                className={index === current ? 'is-active' : ''}
                aria-label={slide.alt || String(index + 1)}
                aria-current={index === current}
                onClick={() => setCurrent(index)}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

export const query = `
  query Query($settings: JSON) {
    imageSliderWidget(settings: $settings) {
      slides {
        url
        alt
        link
      }
      interval
      className
    }
  }
`;

export const variables = `{
  settings: getWidgetSetting()
}`;
