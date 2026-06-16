import { select } from '@evershop/postgres-query-builder';
import { pool } from '../../../lib/postgres/connection.js';
import { comparePassword } from '../../../lib/util/passwordHelper.js';

async function loginUserWithEmail(this: any, email: string, password: string) {
  const userEmail = email.replace(/%/g, '\\%');
  const user = await select()
    .from('admin_user')
    .where('email', 'ILIKE', userEmail)
    .and('status', '=', 1)
    .load(pool);
  const result = comparePassword(password, user ? user.password : '');
  if (!user || !result) {
    throw new Error('Invalid email or password');
  }
  this.session.userID = user.admin_user_id;
  delete user.password;
  this.locals.user = user;
}

export default loginUserWithEmail;
