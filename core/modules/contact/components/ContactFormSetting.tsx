import { Field } from '@components/form/Field';
import React from 'react';
import type { ContactFormWidget } from '../types/index.js';

interface Props {
  contactFormWidget?: Partial<ContactFormWidget> | null;
}

export default function ContactFormSetting({ contactFormWidget }: Props) {
  const { title = '', intro = '', className = 'page-width' } =
    contactFormWidget || {};
  return (
    <div>
      <p className="mb-4">
        Messages are emailed to the contact form recipient (Settings &gt; Store)
        and listed under CMS &gt; Contact messages.
      </p>
      <Field
        type="text"
        name="settings[title]"
        label="Title"
        value={title}
        placeholder="Contact us"
      />
      <Field
        type="textarea"
        name="settings[intro]"
        label="Intro text"
        value={intro}
        placeholder="Text shown above the form"
      />
      <Field
        type="text"
        name="settings[className]"
        label="Custom css classes"
        value={className}
        placeholder="Custom css classes"
      />
    </div>
  );
}

export const query = `
  query Query($title: String, $intro: String, $className: String) {
    contactFormWidget(title: $title, intro: $intro, className: $className) {
      title
      intro
      className
    }
  }
`;

export const variables = `{
  title: getWidgetSetting("title"),
  intro: getWidgetSetting("intro"),
  className: getWidgetSetting("className")
}`;
