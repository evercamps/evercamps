import { Card } from '@components/admin/cms/Card';
import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import './Statistic.scss';

interface SaleStatisticProps {
  api: string;
}

interface SaleStatisticData {
  time: string;
  total: number;
  count: number;
}

export default function SaleStatistic({ api }: SaleStatisticProps) {
  const [data, setData] = useState<SaleStatisticData[]>([]);
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>(
    'monthly'
  );
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    fetch(`${api}?period=${period}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })
      .then((response) => response.json())
      .then((json: SaleStatisticData[]) => {
        setData(json);
        setFetching(false);
      })
      .catch((error: Error) => {
        toast.error(error.message);
        setFetching(false);
      });
  }, [api, period]);

  if (fetching) {
    return (
      <Card title="Sale Statistics">
        <div className="skeleton-wrapper-statistic">
          <div className="skeleton" />
        </div>
      </Card>
    );
  }

  return (
    <Card
      title="Sale Statistics"
      actions={[
        {
          name: 'Daily',
          onAction: () => setPeriod('daily')
        },
        {
          name: 'Weekly',
          onAction: () => setPeriod('weekly')
        },
        {
          name: 'Monthly',
          onAction: () => setPeriod('monthly')
        }
      ]}
    >
      <Card.Session>
        {data.length === 0 ? null : (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart
              data={data}
              margin={{
                top: 5,
                right: 0,
                left: -25,
                bottom: 5
              }}
            >
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />

              <Area
                type="monotone"
                dataKey="total"
                stackId="1"
                stroke="#8884d8"
                fill="#8884d8"
              />

              <Area
                type="monotone"
                dataKey="count"
                stackId="1"
                stroke="#82ca9d"
                fill="#82ca9d"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </Card.Session>
    </Card>
  );
}

export const layout = {
  areaId: 'leftSide',
  sortOrder: 10
};

export const query = `
  query Query {
    api: url(routeId: "salestatistic")
  }
`;