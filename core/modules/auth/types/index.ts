export interface AdminUserRow {
  admin_user_id: number;
  uuid: string;
  status: boolean;
  email: string;
  password?: string;
  full_name: string | null;
  roles?: string;
  twofa_enabled: boolean;
  twofa_secret: string | null;
  twofa_deadline: string | null;
}

export interface TwoFASetupResult {
  secret: string;
  qrCodeDataUrl: string;
}

export interface Verify2FAResult {
  verified: boolean;
  recoveryCodes?: string[];
}

export interface CheckAdminUser2FAResult {
  exists: boolean;
  twofaRequired?: boolean;
  twofaSetupRequired?: boolean;
  valid?: boolean;
  adminUserId?: number;
}
