import speakeasy from 'speakeasy';
import qrcode from 'qrcode';
import { update, select } from '@evershop/postgres-query-builder';
import { camelCase } from '../../../../../lib/util/camelCase.js';

export async function get2FASetup(adminUserId, pool) {
  const secret = speakeasy.generateSecret({
    length: 20,
    name: 'EverCamps:' + adminUserId
  });
  
  await update('admin_user')
    .set({ twofa_secret: secret.base32 })
    .where('admin_user_id', '=', adminUserId)
    .execute(pool);

  //Generate QR code
  const otpauthUrl = secret.otpauth_url;
  const qrCodeDataUrl = await qrcode.toDataURL(otpauthUrl);

  return { secret: secret.base32, qrCodeDataURL };
}

export async function verify2FA(adminUserId, token, pool) {
  const user = await select()
    .from('admin_user')
    .where('admin_user_id', '=', adminUserId)
    .load(pool);

  if (!user || !user.twofa_secret) return false;

  const verified = speakeasy.totp.verify({
    secret: user.twofa_secret,
    encoding: 'base32',
    token,
    window: 1
  });

  if (verified && !user.twofa_enabled) {
    //Enable 2FA after first verification
    await update('admin_user')
      .set({ twofa_enabled: 1 })
      .where('admin_user_id', '=', adminUserId)
      .execute(pool);
  }

  return verified;
}
