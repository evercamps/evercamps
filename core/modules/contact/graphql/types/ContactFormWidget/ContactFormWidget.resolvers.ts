type Args = { title?: string | null; intro?: string | null; className?: string | null };

export default {
  Query: {
    contactFormWidget: (_: unknown, { title, intro, className }: Args) => ({
      title: title || '',
      intro: intro || '',
      className: className || 'page-width'
    })
  }
};
