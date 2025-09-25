import { select, update } from '@evershop/postgres-query-builder';
import { pool } from '../../../../lib/postgres/connection.js';

export default async function handler(req, res) {
  const { userId } = req.params;
  if (!userId) return res.status(400).json({ error: 'Missing userId' });

  const current = await select()
  .from('admin_user')
  .where('uuid', '=', userId)
  .load(pool);

  if (!current) return res.status(404).json({ error: 'User not found' });

  const newDeadline = current.twofa_deadline
    ? new Date(current.twofa_deadline)
    : new Date();
  newDeadline.setDate(newDeadline.getDate() + 14);

  try {
    await update('admin_user')
    .given({ twofa_deadline: newDeadline.toISOString() })
    .where('uuid', '=', userId)
    .execute(pool);

    return res.json({ success: true, deadline: newDeadline.toISOString() });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to extend 2FA' });
  }
}

