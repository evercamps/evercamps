import { Card } from '@components/admin/cms/Card';
import { EmailStatusBadge, formatDateTime } from '@components/admin/email/EmailStatusBadge';
import React from 'react';
import { toast } from 'react-toastify';

interface Props {
  order: {
    resendOrderConfirmationApi: string;
    emailLogs: {
      uuid: string;
      templateName: string;
      recipient: string;
      status: string;
      createdAt?: string | null;
      viewUrl: string;
    }[];
  } | null;
}

export default function OrderEmails({ order }: Props) {
  const [sending, setSending] = React.useState(false);
  if (!order) {
    return null;
  }

  const resend = async () => {
    setSending(true);
    try {
      const response = await fetch(order.resendOrderConfirmationApi, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
        credentials: 'include'
      });
      const json = await response.json();
      if (json.error) {
        toast.error(json.error.message);
      } else if (json.data.status === 'sent') {
        toast.success('Order confirmation sent');
        window.location.reload();
      } else {
        toast.error(`Order confirmation ${json.data.status}${json.data.error ? `: ${json.data.error}` : ''}`);
        window.location.reload();
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSending(false);
    }
  };

  return (
    <Card
      title="Emails"
      actions={[
        {
          name: sending ? 'Sending…' : 'Resend order confirmation',
          onAction: () => {
            if (!sending) {
              resend();
            }
          }
        }
      ]}
    >
      <Card.Session>
        {order.emailLogs.length === 0 ? (
          <div className="text-textSubdued">No emails sent for this order.</div>
        ) : (
          <table className="listing">
            <tbody>
              {order.emailLogs.map((log) => (
                <tr key={log.uuid}>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <a className="text-interactive" href={log.viewUrl}>{formatDateTime(log.createdAt)}</a>
                  </td>
                  <td>{log.templateName}</td>
                  <td>{log.recipient}</td>
                  <td><EmailStatusBadge status={log.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card.Session>
    </Card>
  );
}

export const layout = {
  areaId: 'leftSide',
  sortOrder: 40
};

export const query = `
  query Query {
    order(uuid: getContextValue("orderId")) {
      resendOrderConfirmationApi
      emailLogs {
        uuid
        templateName
        recipient
        status
        createdAt
        viewUrl
      }
    }
  }
`;
