import { Card } from '@components/admin/cms/Card';
import { Field } from '@components/form/Field';
import React from 'react';

interface Props {
  setting: {
    smtpHost?: string | null;
    smtpPort?: number | null;
    smtpSecurity?: string | null;
    smtpUsername?: string | null;
    smtpPasswordSet?: boolean;
    smtpConfiguredInConfig?: boolean;
  };
}

function Row({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card.Session>
      <div className="grid grid-cols-3 gap-8">
        <div className="col-span-1 items-center flex">
          <h4>{title}</h4>
        </div>
        <div className="col-span-2">{children}</div>
      </div>
    </Card.Session>
  );
}

export default function SmtpSetting({ setting }: Props) {
  return (
    <Card title="SMTP">
      {setting.smtpConfiguredInConfig && (
        <Card.Session>
          <div className="text-textSubdued">
            SMTP is set in the configuration file (system.email.smtp). Those values are used instead of
            the fields below.
          </div>
        </Card.Session>
      )}
      <Row title="Host">
        <Field type="text" name="smtpHost" value={setting.smtpHost || ''} placeholder="smtp.example.com" />
      </Row>
      <Row title="Port">
        <Field
          type="text"
          name="smtpPort"
          value={setting.smtpPort ?? 587}
          validationRules={['number']}
          instruction="Usually 587 (STARTTLS) or 465 (SSL)."
        />
      </Row>
      <Row title="Security">
        <Field
          type="select"
          name="smtpSecurity"
          value={setting.smtpSecurity || 'starttls'}
          disableDefaultOption
          options={[
            { value: 'starttls', text: 'STARTTLS' },
            { value: 'ssl', text: 'SSL/TLS' },
            { value: 'none', text: 'None' }
          ]}
        />
      </Row>
      <Row title="Username">
        <Field type="text" name="smtpUsername" value={setting.smtpUsername || ''} autocomplete="off" />
      </Row>
      <Row title="Password">
        <Field
          type="password"
          name="smtpPassword"
          value=""
          autocomplete="new-password"
          placeholder={setting.smtpPasswordSet ? '••••••••' : ''}
          instruction={
            setting.smtpPasswordSet
              ? 'A password is saved. Leave empty to keep it.'
              : 'No password saved.'
          }
        />
      </Row>
    </Card>
  );
}

export const layout = {
  areaId: 'emailTransportSetting',
  sortOrder: 10
};

export const query = `
  query Query {
    setting {
      smtpHost
      smtpPort
      smtpSecurity
      smtpUsername
      smtpPasswordSet
      smtpConfiguredInConfig
    }
  }
`;
