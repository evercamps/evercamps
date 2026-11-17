import { Card } from '@components/admin/cms/Card';
import SettingMenu from '@components/admin/setting/SettingMenu';
import Area from '@components/Area';
import { Field } from '@components/form/Field';
import { Toggle } from '@components/form/fields/Toggle';
import { Form } from '@components/form/Form';
import React from 'react';
import { toast } from 'react-toastify';

interface EmailTransportInfo {
  code: string;
  name: string;
  supportsTracking: boolean;
  configured: boolean;
}

interface Props {
  saveSettingApi: string;
  sendTestEmailApi: string;
  emailLogGridUrl: string;
  setting: {
    emailSendingEnabled: number;
    emailTransport: string;
    emailFromName?: string | null;
    emailFromAddress?: string | null;
    emailReplyTo?: string | null;
    emailAdminRecipients?: string | null;
    emailCustomerWelcomeEnabled: number;
    emailLogBodyRetentionDays: number;
    emailLogRetentionDays: number;
    storeName?: string | null;
  };
  emailTransports: EmailTransportInfo[];
}

// Secret fields left empty keep the stored value (e.g. smtpPassword)
const SECRET_FIELDS = ['smtpPassword'];

function emailSettingDataFilter(data: Record<string, any>): Record<string, any> {
  SECRET_FIELDS.forEach((name) => {
    if (data[name] === '' || data[name] === undefined || data[name] === null) {
      delete data[name];
    }
  });
  return data;
}

function Row({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-8">
      <div className="col-span-1 items-center flex">
        <h4>{title}</h4>
      </div>
      <div className="col-span-2">{children}</div>
    </div>
  );
}

function TestEmail({ api, defaultEmail }: { api: string; defaultEmail: string }) {
  const [email, setEmail] = React.useState(defaultEmail);
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<{ status: string; error?: string | null; logUrl?: string | null } | null>(null);

  const send = async () => {
    setLoading(true);
    setResult(null);
    try {
      const response = await fetch(api, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
        credentials: 'include'
      });
      const json = await response.json();
      if (json.error) {
        toast.error(json.error.message);
      } else {
        setResult(json.data);
        if (json.data.status === 'sent') {
          toast.success('Test email sent');
        } else {
          toast.error(`Test email ${json.data.status}`);
        }
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title="Send a test email">
      <Card.Session>
        <div className="text-textSubdued mb-4">
          Save the settings first. The test uses the saved settings and is logged in the email log.
        </div>
        <div className="flex gap-4 items-center">
          <input
            className="form-field flex-grow"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button type="button" className="button primary" onClick={send} disabled={loading || !email}>
            {loading ? 'Sending…' : 'Send test email'}
          </button>
        </div>
        {result && (
          <div className="mt-4">
            Result: <strong>{result.status}</strong>
            {result.error ? ` – ${result.error}` : ''}
            {result.logUrl && (
              <>
                {' '}
                (<a className="text-interactive" href={result.logUrl}>view in log</a>)
              </>
            )}
          </div>
        )}
      </Card.Session>
    </Card>
  );
}

export default function EmailSetting({
  saveSettingApi,
  sendTestEmailApi,
  emailLogGridUrl,
  setting,
  emailTransports = []
}: Props) {
  return (
    <div className="main-content-inner">
      <div className="grid grid-cols-6 gap-x-8 grid-flow-row">
        <div className="col-span-2">
          <SettingMenu />
        </div>
        <div className="col-span-4 grid gap-8">
          <Form
            id="emailSetting"
            method="POST"
            action={saveSettingApi}
            dataFilter={emailSettingDataFilter as (data: unknown) => unknown}
            onSuccess={(response: any) => {
              if (!response.error) {
                toast.success('Setting saved');
              } else {
                toast.error(response.error.message);
              }
            }}
          >
            <div className="grid gap-8">
              <Card title="Email">
                <Card.Session>
                  <Row title="Send emails?">
                    <Toggle
                      name="emailSendingEnabled"
                      value={setting.emailSendingEnabled}
                      instruction="When off, emails are not sent but still logged as skipped."
                    />
                  </Row>
                </Card.Session>
                <Card.Session>
                  <Row title="Send with">
                    <Field
                      type="select"
                      name="emailTransport"
                      value={setting.emailTransport}
                      disableDefaultOption
                      options={emailTransports.map((t) => ({
                        value: t.code,
                        text: `${t.name}${t.configured ? '' : ' (not configured)'}`
                      }))}
                    />
                  </Row>
                </Card.Session>
                <Card.Session>
                  <Row title="From name">
                    <Field
                      type="text"
                      name="emailFromName"
                      value={setting.emailFromName || ''}
                      placeholder={setting.storeName || 'Store name'}
                      instruction="Empty: the store name."
                    />
                  </Row>
                </Card.Session>
                <Card.Session>
                  <Row title="From address">
                    <Field
                      type="text"
                      name="emailFromAddress"
                      value={setting.emailFromAddress || ''}
                      placeholder="info@example.com"
                      validationRules={['email']}
                      instruction="Empty: the store email."
                    />
                  </Row>
                </Card.Session>
                <Card.Session>
                  <Row title="Reply-to">
                    <Field
                      type="text"
                      name="emailReplyTo"
                      value={setting.emailReplyTo || ''}
                      validationRules={['email']}
                    />
                  </Row>
                </Card.Session>
                <Card.Session>
                  <Row title="New order notification to">
                    <Field
                      type="text"
                      name="emailAdminRecipients"
                      value={setting.emailAdminRecipients || ''}
                      placeholder="admin@example.com, office@example.com"
                      instruction="Comma separated. Empty: no new-order email to the admin."
                    />
                  </Row>
                </Card.Session>
                <Card.Session>
                  <Row title="Welcome email for new accounts">
                    <Toggle name="emailCustomerWelcomeEnabled" value={setting.emailCustomerWelcomeEnabled} />
                  </Row>
                </Card.Session>
                <Card.Session>
                  <Row title="Remove email content after (days)">
                    <Field
                      type="text"
                      name="emailLogBodyRetentionDays"
                      value={setting.emailLogBodyRetentionDays}
                      validationRules={['notEmpty', 'number']}
                      instruction="After this, the log keeps date, recipient, subject and status only."
                    />
                  </Row>
                </Card.Session>
                <Card.Session>
                  <Row title="Delete log entries after (days)">
                    <Field
                      type="text"
                      name="emailLogRetentionDays"
                      value={setting.emailLogRetentionDays}
                      validationRules={['notEmpty', 'number']}
                      instruction="Must be at least the content retention."
                    />
                  </Row>
                </Card.Session>
              </Card>
              <Area id="emailTransportSetting" className="grid gap-8" />
            </div>
          </Form>
          <TestEmail api={sendTestEmailApi} defaultEmail={setting.emailFromAddress || ''} />
          <div>
            <a className="text-interactive" href={emailLogGridUrl}>
              View the email log
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 10
};

export const query = `
  query Query {
    saveSettingApi: url(routeId: "saveSetting")
    sendTestEmailApi: url(routeId: "sendTestEmail")
    emailLogGridUrl: url(routeId: "emailLogGrid")
    setting {
      storeName
      emailSendingEnabled
      emailTransport
      emailFromName
      emailFromAddress
      emailReplyTo
      emailAdminRecipients
      emailCustomerWelcomeEnabled
      emailLogBodyRetentionDays
      emailLogRetentionDays
    }
    emailTransports {
      code
      name
      supportsTracking
      configured
    }
  }
`;
