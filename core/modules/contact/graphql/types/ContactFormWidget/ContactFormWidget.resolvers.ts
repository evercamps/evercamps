import type { ContactFormWidget } from '../../../types/index.js';

type ContactFormWidgetArgs = {
  [K in keyof ContactFormWidget]?: ContactFormWidget[K] | null;
};

export default {
  Query: {
    contactFormWidget: (
      _: unknown,
      { title, intro, className }: ContactFormWidgetArgs
    ): ContactFormWidget => ({
      title: title || '',
      intro: intro || '',
      className: className || 'page-width'
    })
  }
};
