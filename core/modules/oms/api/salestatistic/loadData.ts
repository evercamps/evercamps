import type { Response, NextFunction } from 'express';
import { select } from '@evershop/postgres-query-builder';
import dayjs from 'dayjs';
import { pool } from '../../../../lib/postgres/connection.js';
import type { EvercampsRequest } from '../../../../types/request.js';

interface PeriodRange {
  from: string;
  to: string;
}

interface OrderStatistics {
  total: string | number;
  count: string | number;
}

type Period = 'daily' | 'weekly' | 'monthly';

interface SalesResult {
  total: number | string;
  count: number | string;
  time: string;
}

interface EvercampsResponse extends Response {
  $body?: SalesResult[];
}

export default async (
  request: EvercampsRequest,
  response: EvercampsResponse,
  next: NextFunction
) => {
  try {
    response.$body = [];

    const { period = 'weekly' } = request.query as {
      period?: Period;
    };

    let i = 5;
    const result: PeriodRange[] = [];

    const today = dayjs().format('YYYY-MM-DD').toString();

    while (i >= 0) {
      result[i] = {} as PeriodRange;

      if (period === 'daily') {
        result[i].from = `${dayjs(today)
          .subtract(5 - i, 'day')
          .format('YYYY-MM-DD')} 00:00:00`;

        result[i].to = `${dayjs(today)
          .subtract(5 - i, 'day')
          .format('YYYY-MM-DD')} 23:59:59`;
      }

      if (period === 'weekly') {
        result[i].from = `${dayjs(today)
          .subtract(5 - i, 'week')
          .startOf('week')
          .format('YYYY-MM-DD')} 00:00:00`;

        result[i].to = `${dayjs(today)
          .subtract(5 - i, 'week')
          .endOf('week')
          .format('YYYY-MM-DD')} 23:59:59`;
      }

      if (period === 'monthly') {
        result[i].from = `${dayjs(today)
          .subtract(5 - i, 'month')
          .startOf('month')
          .format('YYYY-MM-DD')} 00:00:00`;

        result[i].to = `${dayjs(today)
          .subtract(5 - i, 'month')
          .endOf('month')
          .format('YYYY-MM-DD')} 23:59:59`;
      }

      i -= 1;
    }

    const results: SalesResult[] = await Promise.all(
      result.map(async (element) => {
        const query = select();

        query
          .from('order')
          .select('SUM (grand_total)', 'total')
          .select('COUNT (order_id)', 'count')
          .where('created_at', '>=', element.from)
          .and('created_at', '<=', element.to);

        query.limit(0, 1);

        const queryResult =
          (await query.execute(pool)) as OrderStatistics[];

        return {
          total: queryResult[0]?.total || 0,
          count: queryResult[0]?.count || 0,
          time: dayjs(element.to).format('MMM DD').toString()
        };
      })
    );

    response.json(results);
  } catch (error) {
    next(error);
  }
};