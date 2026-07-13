import React from 'react';
import { toast } from 'react-toastify';
import './AdminUser.scss';

interface AdminUserInfo {
  email: string;
  fullName: string;
}

interface Props {
  adminUser: AdminUserInfo | null;
  loginPage: string;
  logoutUrl: string;
}

export default function AdminUser({ adminUser, logoutUrl, loginPage }: Props) {
  const [showLogout, setShowLogout] = React.useState(false);

  const show = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowLogout(!showLogout);
  };

  const logout = async () => {
    const response = await fetch(logoutUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    if (response.status === 200) {
      window.location.href = loginPage;
    } else {
      toast.error('Logout failed');
    }
  };

  if (!adminUser) {
    return null;
  }
  const { fullName } = adminUser;
  return (
    <div className="admin-user flex flex-grow justify-end items-center">
      <div className="flex justify-items-start gap-4 justify-center">
        <div className="relative">
          <a className="first-letter" href="#" onClick={(e) => show(e)}>
            {fullName[0]}
          </a>
          {showLogout && (
            <div className="logout bg-background shadow p-8">
              <div>
                <div>
                  Hello <span className="text-primary">{fullName}!</span>
                </div>
                <div className="mt-4">
                  <a
                    className="text-critical"
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      logout();
                    }}
                  >
                    Logout
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export const layout = {
  areaId: 'header',
  sortOrder: 50
};

export const query = `
  query Query {
    adminUser: currentAdminUser {
      adminUserId
      fullName
      email
    },
    logoutUrl: url(routeId: "adminLogoutJson"),
    loginPage: url(routeId: "adminLogin")
  }
`;
