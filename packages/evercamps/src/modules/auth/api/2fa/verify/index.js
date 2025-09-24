import { verify2FA } from '../../../../lib/util/2faHelper.js';

export default async function verify2FAEndpoint({ user, pool, body }, res) {
  if (!user) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }

  try {
    const verified = await verify2FA(user.adminUserId, body.token, pool);

    if (!verified) {
      res.status(400).json({ success: false, message: 'Invalid 2FA code' });
      return;
    }

    res.json({ success: true, message: '2FA verified' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}
