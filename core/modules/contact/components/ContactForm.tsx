import Button from '@components/form/Button';
import { Field } from '@components/form/Field';
import { Form } from '@components/form/Form';
import React from 'react';
import { _ } from '../../../lib/locale/translate/_.js';
import type {
  ContactFormWidget,
  SubmitContactMessageResponse
} from '../types/index.js';

interface Props {
  contactFormWidget?: Partial<ContactFormWidget> | null;
  action: string;
}

const FORM_ID = 'contactForm';

export default function ContactForm({ contactFormWidget, action }: Props) {
  const { title = '', intro = '', className = 'page-width' } =
    contactFormWidget || {};
  const [sent, setSent] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  return (
    <div className={`contact-form-widget ${className}`}>
      {title && <h2 className="mb-4">{title}</h2>}
      {intro && <p className="mb-6">{intro}</p>}
      {sent ? (
        <p className="text-success">
          {_('Thank you for your message. We will get back to you as soon as possible.')}
        </p>
      ) : (
        <>
          {error && <div className="text-critical mb-4">{error}</div>}
          <Form
            id={FORM_ID}
            action={action}
            method="POST"
            isJSON
            submitBtn={false}
            onStart={() => {
              setError(null);
              setLoading(true);
            }}
            onSuccess={(response) => {
              const data = response as SubmitContactMessageResponse;
              if (data.error) {
                setError(data.error.message);
              } else {
                setSent(true);
              }
            }}
            onError={() => {
              setError(_('Your message could not be sent. Please try again later.'));
            }}
            onComplete={() => setLoading(false)}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
              <Field
                name="name"
                type="text"
                label={_('Name')}
                placeholder={_('Name')}
                validationRules={['notEmpty']}
              />
              <Field
                name="email"
                type="text"
                label={_('Email')}
                placeholder={_('Email')}
                validationRules={['notEmpty', 'email']}
              />
            </div>
            <Field
              name="phone"
              type="text"
              label={_('Phone (optional)')}
              placeholder={_('Phone (optional)')}
            />
            <Field
              name="message"
              type="textarea"
              label={_('Message')}
              placeholder={_('Message')}
              validationRules={['notEmpty']}
            />
            {/* Honeypot: hidden from people, bots fill it in */}
            <div
              aria-hidden="true"
              style={{ position: 'absolute', left: '-10000px', width: '1px', height: '1px', overflow: 'hidden' }}
            >
              <label htmlFor="contact-website">Website</label>
              <input id="contact-website" type="text" name="website" tabIndex={-1} autoComplete="off" />
            </div>
            <div className="mt-4">
              <Button
                title={_('Send message')}
                type="submit"
                isLoading={loading}
                onAction={() => {
                  document
                    .getElementById(FORM_ID)
                    ?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
                }}
              />
            </div>
          </Form>
        </>
      )}
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
    action: url(routeId: "submitContactMessage")
  }
`;

export const variables = `{
  title: getWidgetSetting("title"),
  intro: getWidgetSetting("intro"),
  className: getWidgetSetting("className")
}`;
