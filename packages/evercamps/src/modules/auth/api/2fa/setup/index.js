import { get2FASetup } from '../../../../lib/util/2faHelper.js';

export default async function setup2FA({ user, pool }, res) {
  if (!user) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }

  try {
    const qrCode = await get2FASetup(user.adminUserId, pool);
    res.json({ success: true, qrCode });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}
