import speakeasy from 'speakeasy';
import qrcode from 'qrcode';
import bcrypt from 'bcrypt';
import { pool } from '../../../lib/postgres/connection.js';
import { insert, update, select, del } from '@evershop/postgres-query-builder';
import type { AdminUserRow, TwoFASetupResult, Verify2FAResult } from '../types/index.js';

export async function get2FASetup(email: string): Promise<TwoFASetupResult> {
  const secret = speakeasy.generateSecret({
    length: 20,
    name: 'EverCamps:' + email
  });
  await update('admin_user')
    .given({ twofa_secret: secret.base32 })
    .where('email', '=', email)
    .execute(pool);

  const otpauthUrl = secret.otpauth_url;
  const qrCodeDataUrl = await qrcode.toDataURL(otpauthUrl as string);

  return { secret: secret.base32, qrCodeDataUrl };
}

export async function verify2FA(email: string, token: string): Promise<Verify2FAResult> {
  const user: AdminUserRow | null = await select()
    .from('admin_user')
    .where('email', '=', email)
    .load(pool);
  if (!user || !user.twofa_secret) return { verified: false };

  let verified = false;
  let usedRecoveryCode: any = null;

  if (user.twofa_secret) {
    verified = speakeasy.totp.verify({
      secret: user.twofa_secret,
      encoding: 'base32',
      token,
      window: 1
    });
  }

  if (!verified) {
    const recoveryCodes = await select()
      .from('admin_user_recovery_codes')
      .where('admin_user_id', '=', user.admin_user_id)
      .execute(pool);

    for (const row of recoveryCodes) {
      const match = await bcrypt.compare(token, row.code_hash);
      if (match) {
        verified = true;
        usedRecoveryCode = row;
        break;
      }
    }
    if (usedRecoveryCode) {
      await del('admin_user_recovery_codes')
        .where('recovery_code_id', '=', usedRecoveryCode.recovery_code_id)
        .execute(pool);
    }
  }

  if (verified && !user.twofa_enabled && user.twofa_secret) {
    await update('admin_user')
      .given({ twofa_enabled: true })
      .where('admin_user_id', '=', user.admin_user_id)
      .execute(pool);

    const codes = generateRecoveryCodes();
    for (const code of codes) {
      await insert('admin_user_recovery_codes')
        .given({
          admin_user_id: user.admin_user_id,
          code_hash: await bcrypt.hash(code, 10)
        })
        .execute(pool);
    }
    return { verified: true, recoveryCodes: codes };
  }

  return { verified };
}

function generateRecoveryCodes(count = 10): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const code = speakeasy.generateSecret({ length: 10 }).base32;
    codes.push(code);
  }
  return codes;
}
