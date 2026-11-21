import { Card } from '@components/admin/cms/Card';
import Pagination from '@components/grid/Pagination';
import React from 'react';

interface ContactMessageItem {
  uuid: string;
  name: string;
  email: string;
  phone?: string | null;
  message: string;
  createdAt?: string | null;
}

interface Props {
  contactMessages: {
    items: ContactMessageItem[];
    total: number;
    page: number;
    limit: number;
    search?: string | null;
  };
  setting: { contactMessageRetentionDays: number };
}

function formatDateTime(value?: string | null): string {
  if (!value) {
    return '—';
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export default function Grid({ contactMessages, setting }: Props) {
  const { items = [], total = 0, page = 1, limit = 30, search = '' } =
    contactMessages || ({} as Props['contactMessages']);

  return (
    <Card>
      <Card.Session>
        <form method="GET" className="flex gap-4 items-end flex-wrap">
          <div>
            <label className="block mb-1" htmlFor="search">Search</label>
            <input
              id="search"
              className="form-field"
              type="text"
              name="search"
              defaultValue={search || ''}
              placeholder="Name, email or message"
            />
          </div>
          <button type="submit" className="button primary">Filter</button>
          <a className="text-interactive" href="?">Reset</a>
        </form>
        <p className="mt-4 text-textSubdued">
          Messages are deleted automatically after{' '}
          {setting?.contactMessageRetentionDays} days.
        </p>
      </Card.Session>
      <table className="listing sticky">
        <thead>
          <tr>
            <th>Date</th>
            <th>Name</th>
            <th>Email</th>
            <th>Phone</th>
            <th>Message</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.uuid}>
              <td style={{ whiteSpace: 'nowrap', verticalAlign: 'top' }}>
                {formatDateTime(item.createdAt)}
              </td>
              <td style={{ verticalAlign: 'top' }}>{item.name}</td>
              <td style={{ verticalAlign: 'top' }}>
                <a className="text-interactive" href={`mailto:${item.email}`}>
                  {item.email}
                </a>
              </td>
              <td style={{ whiteSpace: 'nowrap', verticalAlign: 'top' }}>
                {item.phone || '—'}
              </td>
              <td style={{ whiteSpace: 'pre-wrap', verticalAlign: 'top' }}>
                {item.message}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {items.length === 0 && (
        <div className="flex w-full justify-center p-8">No messages to display.</div>
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
  query Query($filters: ContactMessageFilterInput) {
    contactMessages(filters: $filters) {
      items {
        uuid
        name
        email
        phone
        message
        createdAt
      }
      total
      page
      limit
      search
    }
    setting {
      contactMessageRetentionDays
    }
  }
`;

export const variables = `
{
  filters: getContextValue('contactMessageFilters')
}`;
