/** One image of an image slider widget */
export type ImageSlide = {
  url: string;
  alt: string;
  /** Optional link the image points to; empty when there is none */
  link: string;
};

/** Settings of an image slider widget, as the GraphQL type returns them */
export type ImageSliderWidget = {
  slides: ImageSlide[];
  /** Seconds per image; 0 turns autoplay off */
  interval: number;
  className: string;
};
