import { Field } from '@components/form/Field';
import { Form } from '@components/form/Form';
import Area from '@components/Area';
import React from 'react';

import './RegisterForm.scss';
import { _ } from '../../../../../lib/locale/translate/_.js';

interface RegisterFormProps {
  action: string;
  homeUrl: string;
  loginApi: string;
  loginUrl: string;
}

interface RegisterResponse {
  error?: {
    message: string;
  };
}

interface LoginResponse {
  error?: {
    message: string;
  };
}

export default function RegisterForm({
  action,
  homeUrl,
  loginApi,
  loginUrl
}: RegisterFormProps) {
  const [error, setError] = React.useState<string | null>(null);
  const [email, setEmail] = React.useState<string>('');
  const [password, setPassword] = React.useState<string>('');
  const [redirectUrl, setRedirectUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      setRedirectUrl(params.get('redirect'));
    }
  }, []);

  return (
    <div className="flex justify-center items-center">
      <div className="register-form flex justify-center items-center">
        <div className="register-form-inner">
          <h1 className="text-center">{_('Create A New Account')}</h1>

          {error && <div className="text-critical mb-4">{error}</div>}

          <Form
            id="registerForm"
            action={action}
            isJSON
            method="POST"
            onSuccess={async (response) => {
              const data = response as RegisterResponse;

              if (!data.error) {
                const loginResponse = await fetch(loginApi, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                    email,
                    password
                  })
                });

                const loginResponseJson =
                  (await loginResponse.json()) as LoginResponse;

                if (loginResponseJson.error) {
                  setError(loginResponseJson.error.message);
                } else {
                  window.location.href = redirectUrl || homeUrl;
                }
              } else {
                setError(data.error.message);
              }
            }}
            btnText={_('SIGN UP')}
          >
            <Area
              id="customerRegisterForm"
              coreComponents={[
                {
                  component: {
                    default: () => (
                      <Field
                        name="full_name"
                        type="text"
                        placeholder={_('Full Name')}
                        validationRules={['notEmpty']}
                      />
                    )
                  },
                  sortOrder: 10
                },
                {
                  component: {
                    default: () => (
                      <Field
                        name="email"
                        type="text"
                        placeholder={_('Email')}
                        validationRules={['notEmpty', 'email']}
                        onChange={(e) => {
                          const event = e as React.ChangeEvent<HTMLInputElement>;
                          setEmail(event.target.value);
                        }}
                      />
                    )
                  },
                  sortOrder: 20
                },
                {
                  component: {
                    default: () => (
                      <Field
                        name="password"
                        type="password"
                        placeholder={_('Password')}
                        validationRules={['notEmpty']}
                        onChange={(e) => {
                          const event = e as React.ChangeEvent<HTMLInputElement>;
                          setPassword(event.target.value);
                        }}
                      />
                    )
                  },
                  sortOrder: 30
                }
              ]}
            />
          </Form>

          <div className="text-center mt-4">
            <span>
              {_('Already have an account?')}{' '}
              <a
                className="text-interactive"
                href={`${loginUrl}${
                  redirectUrl
                    ? `?redirect=${encodeURIComponent(redirectUrl)}`
                    : ''
                }`}
              >
                {_('Login')}
              </a>
            </span>
          </div>
        </div>
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
    homeUrl: url(routeId: "homepage")
    action: url(routeId: "createCustomer")
    loginApi: url(routeId: "customerLoginJson")
    loginUrl: url(routeId: "login")
  }
`;