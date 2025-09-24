import { select } from '@evershop/postgres-query-builder';
import { pool } from '../../../lib/postgres/connection.js';
import { verify2FA } from './admin2FA.js';
import { comparePassword } from '../../../lib/util/passwordHelper.js';

export async function checkAdminUser2FA(email, password, token) {
  const dbUser = await select()
    .from('admin_user')
    .where('email', '=', email)
    .load(pool);  

  if (!dbUser || !comparePassword(password, dbUser.password)) {
    return { exists: false };
  }

  if (dbUser.twofa_enabled) {
    if (!token) {
      return { twofaRequired: true, adminUserId: dbUser.admin_user_id, exists: true };
    }

    const valid = await verify2FA(dbUser.admin_user_id, token, pool);
    if (!valid) {
      return { twofaRequired: true, valid: false, exists: true };
    }
  }

  return { exists: true, twofaRequired: false, valid: true, adminUserId: dbUser.admin_user_id };
}
