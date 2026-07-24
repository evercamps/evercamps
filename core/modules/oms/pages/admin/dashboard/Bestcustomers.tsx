import { Card } from '@components/admin/cms/Card';
import { useAppState } from '@components/context/app';

interface Setting {
  storeCurrency?: string;
}

interface BestCustomer {
  total: number;
  orders: number;
  full_name: string;
  editUrl?: string;
}

interface BestCustomersProps {
  listUrl: string;
  setting: Setting;
}

export default function BestCustomers({
  listUrl,
  setting
}: BestCustomersProps) {
  const context = useAppState();
  const customers: BestCustomer[] = (context?.bestCustomers as BestCustomer[]) || [];

  return (
    <Card
      title="Best customers"
      actions={[
        {
          name: 'All customers',
          onAction: () => {
            window.location.href = listUrl;
          }
        }
      ]}
    >
      <Card.Session>
        <table className="listing">
          <thead>
            <tr>
              <th>Full name</th>
              <th>Orders</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c, i) => {
              const grandTotal = new Intl.NumberFormat('en', {
                style: 'currency',
                currency: setting.storeCurrency
              }).format(c.total);

              return (
                <tr key={i}>
                  <td>
                    <a href={c.editUrl || ''}>{c.full_name}</a>
                  </td>
                  <td>{c.orders}</td>
                  <td>{grandTotal}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card.Session>
    </Card>
  );
}

export const query = `
  query Query {
    setting {
      storeCurrency
    }
    listUrl: url(routeId: "productGrid")
  }
`;