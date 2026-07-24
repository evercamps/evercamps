import { Card } from '@components/admin/cms/Card';
import Dot from '@components/Dot';
import React from 'react';
import { toast } from 'react-toastify';
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import './Lifetimesales.scss';

const COLORS = ['#aee9d1', '#fed3d1', '#a4e8f2'];

interface LifetimeSaleProps {
  api: string;
}

interface LifetimeSaleData {
  orders?: number;
  total?: string | number;
  completed_percentage?: number;
  cancelled_percentage?: number;
}

export default function LifetimeSale({ api }: LifetimeSaleProps) {
  const [data, setData] = React.useState<LifetimeSaleData>({});
  const [fetching, setFetching] = React.useState(true);

  const {
    orders = 0,
    total = 0,
    completed_percentage = 0,
    cancelled_percentage = 0
  } = data;

  const chartData = [
    { name: 'Completed', value: completed_percentage },
    { name: 'Cancelled', value: cancelled_percentage },
    {
      name: 'Others',
      value: 100 - completed_percentage - cancelled_percentage
    }
  ];

  React.useEffect(() => {
    fetch(api, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })
      .then((response) => response.json())
      .then((json: LifetimeSaleData) => {
        setData(json);
        setFetching(false);
      })
      .catch((error: Error) => {
        toast.error(error.message);
        setFetching(false);
      });
  }, [api]);

  if (fetching) {
    return (
      <Card title="Lifetime Sales">
        <Card.Session>
          <div className="skeleton-wrapper-lifetime">
            <div className="skeleton" />
            <div className="skeleton" />
            <div className="skeleton" />
            <div className="skeleton" />
          </div>
        </Card.Session>

        <Card.Session>
          <div className="skeleton-wrapper-lifetime">
            <div className="skeleton-chart" />
          </div>
        </Card.Session>
      </Card>
    );
  }

  return (
    <Card title="Lifetime Sales">
      <Card.Session>
        <div className="grid grid-cols-1 gap-4">
          <div className="flex space-x-4 items-center">
            <Dot variant="info" />
            <div className="self-center">{orders} orders</div>
          </div>

          <div className="flex space-x-4 items-center">
            <Dot variant="info" />
            <div className="self-center">{total} lifetime sale</div>
          </div>

          <div className="flex space-x-4 items-center">
            <Dot variant="success" />
            <div className="self-center">
              {completed_percentage}% of orders completed
            </div>
          </div>

          <div className="flex space-x-4 items-center">
            <Dot variant="critical" />
            <div className="self-center">
              {cancelled_percentage}% of orders cancelled
            </div>
          </div>
        </div>
      </Card.Session>

      <Card.Session>
        <div style={{ height: '200px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                labelLine={false}
                fill="#8884d8"
                dataKey="value"
                label
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </Card.Session>
    </Card>
  );
}

export const layout = {
  areaId: 'rightSide',
  sortOrder: 10
};

export const query = `
  query Query {
    api: url(routeId: "lifetimesales")
  }
`;