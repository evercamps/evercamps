import Button from '@components/form/Button';
import React from 'react';

import './UpdatePasswordForm.scss';
import { _ } from '../../../../../lib/locale/translate/_.js';

interface UpdatePasswordFormProps {
  action: string;
  loginUrl: string;
  resetPasswordUrl: string;
}

const MIN_LENGTH = 6;

/**
 * Set a new password with the token from the reset password email
 * (/account/update-password?token=...). Posts to POST /api/customers/password.
 */
export default function UpdatePasswordForm({
  action,
  loginUrl,
  resetPasswordUrl
}: UpdatePasswordFormProps) {
  const [token, setToken] = React.useState<string | null>(null);
  const [password, setPassword] = React.useState('');
  const [confirm, setConfirm] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [success, setSuccess] = React.useState(false);

  React.useEffect(() => {
    setToken(new URLSearchParams(window.location.search).get('token') || '');
  }, []);

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null);
    if (password.length < MIN_LENGTH) {
      setError(_('Your password must be at least ${length} characters', { length: String(MIN_LENGTH) }));
      return;
    }
    if (password !== confirm) {
      setError(_('Passwords do not match'));
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(action, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({ token, password })
      });
      const json = await response.json();
      if (json.error) {
        setError(json.error.message || _('Something went wrong. Please try again'));
      } else {
        setSuccess(true);
      }
    } catch {
      setError(_('Something went wrong. Please try again'));
    } finally {
      setLoading(false);
    }
  };

  let content: React.ReactNode;
  if (token === null) {
    content = null;
  } else if (token === '') {
    content = (
      <p className="text-center">
        {_('This link is invalid or expired.')}{' '}
        <a href={resetPasswordUrl} className="text-interactive">
          {_('Request a new link')}
        </a>
      </p>
    );
  } else if (success) {
    content = (
      <p className="text-center text-success">
        {_('Your password has been changed.')}{' '}
        <a href={loginUrl} className="text-interactive">
          {_('Login')}
        </a>
      </p>
    );
  } else {
    content = (
      <>
        <h1 className="text-center">{_('Set a new password')}</h1>
        {error && <div className="text-critical mb-4">{error}</div>}
        <form id="updatePasswordForm" onSubmit={submit}>
          <div className="form-field-container">
            <input
              className="form-field"
              type="password"
              name="password"
              autoComplete="new-password"
              placeholder={_('New password')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="form-field-container mt-4">
            <input
              className="form-field"
              type="password"
              name="confirm_password"
              autoComplete="new-password"
              placeholder={_('Confirm new password')}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>
          <div className="form-submit-button flex border-t border-divider mt-4 pt-4">
            <Button
              title={_('SAVE PASSWORD')}
              type="submit"
              onAction={() => {
                submit();
              }}
              isLoading={loading}
            />
          </div>
        </form>
      </>
    );
  }

  return (
    <div className="flex justify-center items-center">
      <div className="update-password-form flex justify-center items-center">
        <div className="update-password-form-inner">{content}</div>
      </div>
    </div>
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 10
};

export const query = `
  query Query {
    action: url(routeId: "updatePassword")
    loginUrl: url(routeId: "login")
    resetPasswordUrl: url(routeId: "resetPasswordPage")
  }
`;
