import { update } from '@evershop/postgres-query-builder';
import { pool } from '../../../../lib/postgres/connection.js';

export default async (request, response, next) => {
  const { userId } = request.params;
  if (!userId) return response.status(400).json({ error: 'Missing userId' });

  const deadline = new Date();
  deadline.setDate(deadline.getDate() + 14);

  try {
    await update('admin_user')
      .given({
        twofa_deadline: deadline.toISOString()
      })
      .where('uuid', '=', userId)
      .execute(pool);

    return response.json({ success: true, deadline: deadline.toISOString() });
  } catch (err) {
    console.error(err);
    return response.status(500).json({ error: 'Failed to enable 2FA' });
  }
}

