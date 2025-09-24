import { Field } from '@components/common/form/Field';
import { Form } from '@components/common/form/Form';
import PropTypes from 'prop-types';
import React, { useState } from 'react';
import './LoginForm.scss';
import Area from '@components/common/Area';

export default function LoginForm({ authUrl, dashboardUrl }) {
  const [error, setError] = React.useState(null);
  const [twofaRequired, setTwofaRequired] = useState(false);
  const [credentials, setCredentials] = useState({ email: '', password: '' });

  const onSuccess = (response) => {
    console.log(response);
    if (response.data?.twofaRequired) {
      setTwofaRequired(true);
      setCredentials({
        email: response.email || credentials.email,
        password: response.password || credentials.password
      });
      setError(null);
      console.log(twofaRequired);
    } else if (!response.error) {      
      window.location.href = dashboardUrl;
    } else {
      setError(response.error.message);
    }
  };

  return (
    <div className="admin-login-form">
      <div className="flex items-center justify-center mb-12">
        <svg
          width="60"
          height="61"
          viewBox="0 0 251 276"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M200,50 C120,0 40,60 40,146 C40,228 120,290 200,240"
            fill="none"
            stroke="#27BEA3"
            strokeWidth="36"
            strokeLinecap="round"
          />
          <line x1="170" y1="100" x2="200" y2="100" stroke="#27BEA3" strokeWidth="20" strokeLinecap="round" />
          <line x1="170" y1="145" x2="200" y2="145" stroke="#27BEA3" strokeWidth="20" strokeLinecap="round" />
          <line x1="170" y1="190" x2="200" y2="190" stroke="#00546B" strokeWidth="20" strokeLinecap="round" />
          <line x1="130" y1="100" x2="130" y2="190" stroke="#27BEA3" strokeWidth="20" strokeLinecap="round" />
        </svg>
      </div>
      {error && <div className="text-critical py-4">{error}</div>}
      <Form
        action={authUrl}
        method="POST"
        id="adminLoginForm"
        isJSON
        onSuccess={onSuccess}
        btnText={twofaRequired ? 'VERIFY 2FA' : 'SIGN IN'}
      >
        <Area
          id="adminLoginForm"
          coreComponents={[
            !twofaRequired && {
            component: { default: Field },
            props: {
              name: 'email',
              type: 'email',
              label: 'Email',
              placeholder: 'Email',
              validationRules: ['notEmpty', 'email'],
              value: credentials.email,
              onChange: (e) =>
                setCredentials({ ...credentials, email: e.target.value })
            },
              sortOrder: 10
            },
            !twofaRequired && {
            component: { default: Field },
            props: {
              name: 'password',
              type: 'password',
              label: 'Password',
              placeholder: 'Password',
              validationRules: ['notEmpty'],
              value: credentials.password,
              onChange: (e) =>
                setCredentials({ ...credentials, password: e.target.value })
            },
              sortOrder: 20
            },
            twofaRequired && {
              component: { default: Field },
              props: {
                name: 'token',
                type: 'text',
                label: '2FA Code',
                placeholder: 'Enter 6-digit code',
                validationRules: ['notEmpty'],
                autoFocus: true
              },
              sortOrder: 30
            }
          ].filter(Boolean)}
          noOuter
        />
        {twofaRequired && (
          <input type="hidden" name="email" value={credentials.email} />
        )}
        {twofaRequired && (
          <input type="hidden" name="password" value={credentials.password} />
        )}
      </Form>
    </div>
  );
}

LoginForm.propTypes = {
  authUrl: PropTypes.string.isRequired,
  dashboardUrl: PropTypes.string.isRequired
};

export const layout = {
  areaId: 'content',
  sortOrder: 10
};

export const query = `
  query Query {
    authUrl: url(routeId: "adminLoginJson")
    dashboardUrl: url(routeId: "dashboard")
  }
`;
