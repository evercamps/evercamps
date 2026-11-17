import { Card } from '@components/admin/cms/Card';
import { EmailStatusBadge, formatDateTime } from '@components/admin/email/EmailStatusBadge';
import Pagination from '@components/grid/Pagination';
import React from 'react';

interface EmailLogItem {
  uuid: string;
  templateName: string;
  recipient: string;
  subject: string;
  status: string;
  transport?: string | null;
  createdAt?: string | null;
  openedAt?: string | null;
  clickedAt?: string | null;
  openCount?: number;
  clickCount?: number;
  viewUrl: string;
}

interface Props {
  emailLogs: {
    items: EmailLogItem[];
    total: number;
    page: number;
    limit: number;
    status?: string | null;
    template?: string | null;
    recipient?: string | null;
  };
  emailTemplates: { code: string; name: string }[];
  emailTransports: { code: string; supportsTracking: boolean }[];
  setting: { emailTransport: string };
}

const STATUSES = ['queued', 'sent', 'delivered', 'failed', 'skipped', 'bounced', 'spam', 'blocked'];

export default function Grid({ emailLogs, emailTemplates = [], emailTransports = [], setting }: Props) {
  const { items = [], total = 0, page = 1, limit = 30 } = emailLogs || ({} as Props['emailLogs']);
  const filters = emailLogs || ({} as Props['emailLogs']);
  const tracking = Boolean(
    emailTransports.find((t) => t.code === setting?.emailTransport)?.supportsTracking
  );

  return (
    <Card>
      <Card.Session>
        <form method="GET" className="flex gap-4 items-end flex-wrap">
          <div>
            <label className="block mb-1" htmlFor="recipient">Recipient</label>
            <input
              id="recipient"
              className="form-field"
              type="text"
              name="recipient"
              defaultValue={filters?.recipient || ''}
              placeholder="name@example.com"
            />
          </div>
          <div>
            <label className="block mb-1" htmlFor="template">Email</label>
            <select id="template" className="form-field" name="template" defaultValue={filters?.template || ''}>
              <option value="">All</option>
              {emailTemplates.map((t) => (
                <option key={t.code} value={t.code}>{t.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block mb-1" htmlFor="status">Status</label>
            <select id="status" className="form-field" name="status" defaultValue={filters?.status || ''}>
              <option value="">All</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <button type="submit" className="button primary">Filter</button>
          <a className="text-interactive" href="?">Reset</a>
        </form>
      </Card.Session>
      <table className="listing sticky">
        <thead>
          <tr>
            <th>Date</th>
            <th>Email</th>
            <th>Recipient</th>
            <th>Subject</th>
            <th>Status</th>
            {tracking && <th>Opened</th>}
            {tracking && <th>Clicked</th>}
          </tr>
        </thead>
        <tbody>
          {items.map((log) => (
            <tr key={log.uuid}>
              <td style={{ whiteSpace: 'nowrap' }}>
                <a className="text-interactive" href={log.viewUrl}>{formatDateTime(log.createdAt)}</a>
              </td>
              <td>{log.templateName}</td>
              <td>{log.recipient}</td>
              <td>{log.subject}</td>
              <td><EmailStatusBadge status={log.status} /></td>
              {tracking && <td>{log.openedAt ? `${formatDateTime(log.openedAt)} (${log.openCount})` : '—'}</td>}
              {tracking && <td>{log.clickedAt ? `${formatDateTime(log.clickedAt)} (${log.clickCount})` : '—'}</td>}
            </tr>
          ))}
        </tbody>
      </table>
      {items.length === 0 && (
        <div className="flex w-full justify-center p-8">No emails to display.</div>
      )}
      <Pagination total={total} limit={limit} page={page} />
    </Card>
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 20
};

export const query = `
  query Query($filters: EmailLogFilterInput) {
    emailLogs(filters: $filters) {
      items {
        uuid
        templateName
        recipient
        subject
        status
        transport
        createdAt
        openedAt
        clickedAt
        openCount
        clickCount
        viewUrl
      }
      total
      page
      limit
      status
      template
      recipient
    }
    emailTemplates {
      code
      name
    }
    emailTransports {
      code
      supportsTracking
    }
    setting {
      emailTransport
    }
  }
`;

export const variables = `
{
  filters: getContextValue('emailLogFilters')
}`;
