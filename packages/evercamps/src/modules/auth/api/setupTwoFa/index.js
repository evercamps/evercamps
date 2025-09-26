import { get2FASetup } from "../../services/admin2FA.js";

export default async (request, response, next) => {
  let user = request.getCurrentUser();
  if (!user) {
    response.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }

  try {
    const qrCode = await get2FASetup(user.email);
    response.json({ success: true, qrCode });
  } catch (err) {
    response.status(500).json({ success: false, message: 'Server error' });
  }
}
