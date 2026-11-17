import { Card } from '@components/admin/cms/Card';
import PageHeading from '@components/admin/cms/PageHeading';
import { EmailStatusBadge, formatDateTime } from '@components/admin/email/EmailStatusBadge';
import React from 'react';
import { toast } from 'react-toastify';

interface EmailLogDetail {
  uuid: string;
  templateName: string;
  recipient: string;
  subject: string;
  status: string;
  transport?: string | null;
  providerMessageId?: string | null;
  error?: string | null;
  attempts?: number;
  hasBody: boolean;
  bodyHtml?: string | null;
  createdAt?: string | null;
  sentAt?: string | null;
  deliveredAt?: string | null;
  openedAt?: string | null;
  clickedAt?: string | null;
  openCount?: number;
  clickCount?: number;
  events: { event: string; occurredAt?: string | null; data?: any }[];
  resendApi: string;
  orderUrl?: string | null;
}

interface Props {
  emailLog: EmailLogDetail | null;
  emailLogGridUrl: string;
  setting: { emailLogBodyRetentionDays: number };
}

function Meta({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-4 py-1">
      <div className="text-textSubdued">{label}</div>
      <div className="col-span-2" style={{ wordBreak: 'break-word' }}>{children}</div>
    </div>
  );
}

export default function View({ emailLog, emailLogGridUrl, setting }: Props) {
  const [resending, setResending] = React.useState(false);

  if (!emailLog) {
    return (
      <div className="main-content-inner">
        <PageHeading backUrl={emailLogGridUrl} heading="Email not found" />
      </div>
    );
  }

  const resend = async () => {
    setResending(true);
    try {
      const response = await fetch(emailLog.resendApi, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
        credentials: 'include'
      });
      const json = await response.json();
      if (json.error) {
        toast.error(json.error.message);
      } else if (json.data.status === 'sent') {
        toast.success('Email sent again');
        if (json.data.logUrl) {
          window.location.href = json.data.logUrl;
        }
      } else {
        toast.error(`Email ${json.data.status}${json.data.error ? `: ${json.data.error}` : ''}`);
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="main-content-inner">
      <PageHeading backUrl={emailLogGridUrl} heading={emailLog.subject} />
      <div className="grid grid-cols-3 gap-x-8 grid-flow-row">
        <div className="col-span-2">
          <Card title="Content">
            <Card.Session>
              {emailLog.hasBody && emailLog.bodyHtml ? (
                <iframe
                  title="Email content"
                  sandbox=""
                  srcDoc={emailLog.bodyHtml}
                  style={{ width: '100%', height: '70vh', border: '1px solid #e5e7eb', background: '#fff' }}
                />
              ) : (
                <div className="text-textSubdued">
                  The content of this email was removed after {setting.emailLogBodyRetentionDays} days, or
                  the email was never rendered.
                </div>
              )}
            </Card.Session>
          </Card>
        </div>
        <div className="col-span-1 grid gap-8 content-start">
          <Card title="Details">
            <Card.Session>
              <Meta label="Email">{emailLog.templateName}</Meta>
              <Meta label="To">{emailLog.recipient}</Meta>
              <Meta label="Status"><EmailStatusBadge status={emailLog.status} /></Meta>
              {emailLog.error && <Meta label="Error"><span className="text-critical">{emailLog.error}</span></Meta>}
              <Meta label="Created">{formatDateTime(emailLog.createdAt)}</Meta>
              <Meta label="Sent">{formatDateTime(emailLog.sentAt)}</Meta>
              <Meta label="Sent with">{emailLog.transport || '—'}</Meta>
              <Meta label="Attempts">{emailLog.attempts ?? 0}</Meta>
              {emailLog.deliveredAt && <Meta label="Delivered">{formatDateTime(emailLog.deliveredAt)}</Meta>}
              {emailLog.openedAt && (
                <Meta label="Opened">{`${formatDateTime(emailLog.openedAt)} (${emailLog.openCount}×)`}</Meta>
              )}
              {emailLog.clickedAt && (
                <Meta label="Clicked">{`${formatDateTime(emailLog.clickedAt)} (${emailLog.clickCount}×)`}</Meta>
              )}
              {emailLog.providerMessageId && <Meta label="Message id">{emailLog.providerMessageId}</Meta>}
              {emailLog.orderUrl && (
                <Meta label="Order"><a className="text-interactive" href={emailLog.orderUrl}>View order</a></Meta>
              )}
            </Card.Session>
            {emailLog.hasBody && (
              <Card.Session>
                <button type="button" className="button secondary" onClick={resend} disabled={resending}>
                  {resending ? 'Sending…' : 'Resend'}
                </button>
              </Card.Session>
            )}
          </Card>
          {emailLog.events.length > 0 && (
            <Card title="Events">
              <Card.Session>
                <ul>
                  {emailLog.events.map((e, i) => (
                    <li key={i} className="py-1">
                      <strong>{e.event}</strong> · {formatDateTime(e.occurredAt)}
                      {e.data?.link && <div className="text-textSubdued" style={{ wordBreak: 'break-all' }}>{e.data.link}</div>}
                      {e.data?.reason && <div className="text-textSubdued">{e.data.reason}</div>}
                    </li>
                  ))}
                </ul>
              </Card.Session>
            </Card>
          )}
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
    emailLogGridUrl: url(routeId: "emailLogGrid")
    setting {
      emailLogBodyRetentionDays
    }
    emailLog(uuid: getContextValue("emailLogUuid")) {
      uuid
      templateName
      recipient
      subject
      status
      transport
      providerMessageId
      error
      attempts
      hasBody
      bodyHtml
      createdAt
      sentAt
      deliveredAt
      openedAt
      clickedAt
      openCount
      clickCount
      events {
        event
        occurredAt
        data
      }
      resendApi
      orderUrl
    }
  }
`;
