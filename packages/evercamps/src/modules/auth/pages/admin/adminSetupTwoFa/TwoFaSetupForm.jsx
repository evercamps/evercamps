import { Field } from '@components/common/form/Field';
import { Form } from '@components/common/form/Form';
import Button from '@components/common/form/Button';
import PropTypes from 'prop-types';
import React, { useState } from 'react';
import './TwoFaSetupForm.scss';
import Area from '@components/common/Area';
import { toast } from 'react-toastify';

export default function TwoFaSetupForm({ setupUrl, verifyUrl, skipUrl, dashboardUrl, user }) {
  const [step, setStep] = useState(1);
  const [qrCodeData, setQrCodeData] = useState(null);
  const [token, setToken] = useState('');
  const [error, setError] = useState(null);
  const [recoveryCodes, setRecoveryCodes] = useState([]);
  const deadline = user?.twofaDeadline
  ? new Date(parseInt(user.twofaDeadline, 10))
  : null;
  const skipAllowed = !deadline || deadline > new Date();

  const onSuccess = (response) => {
    if (!response.error) {
      if (response.data?.recoveryCodes) {
        setRecoveryCodes(response.data.recoveryCodes);
      }
      setStep(3);
    } else {
      setError(response.error.message);
    }
  };

  const handleContinue = async () => {
    try {      
      const res = await fetch(setupUrl, { method: 'POST' });
      const data = await res.json();
      console.log(data);
      if (!data.qrCode) {
        setError('Failed to retrieve 2FA setup information.');
        return;
      }

      setQrCodeData(data.qrCode);
      setStep(2);
    } catch (err) {
      setError('An error occurred while fetching 2FA setup.');
      console.error(err);
    }
  };  

  return (
    <div className="twofa-setup-form">
      {step === 1 && (
        <>
          <h2 className="text-2xl font-semibold mb-4">Two-Factor Authentication Required</h2>
          <p className="mb-6">
            You are required to set up two-factor authentication for your account.
          </p>
          {error && <div className="text-critical mb-4">{error}</div>}
          <div className="flex gap-4">
            {skipAllowed && (
              <Button
                title="Skip for now"
                variant="secondary"
                onAction={() => (window.location.href = dashboardUrl)}
              />
            )}
            <Button
              title="Continue"
              variant="primary"
              onAction={handleContinue}
            />
          </div>
        </>
      )}

      {step === 2 && qrCodeData && (
        <Form         
        action={verifyUrl}
        method="POST"     
        id='verify2FaForm'  
        isJSON 
        onSuccess={onSuccess}         
        submitBtn={false}>
          <h2 className="text-2xl font-semibold mb-4">Scan QR Code</h2>
          <p className="mb-4">Scan this QR code with your authenticator app or enter the secret manually.</p>

          <div className="mb-4">
            <img src={qrCodeData.qrCodeDataUrl} alt="2FA QR Code" style={{ maxWidth: '250px' }} />
          </div>

          <div className="mb-4">
            <p className="font-semibold">Secret: {qrCodeData.secret}</p>
            <Button
              title="Copy Secret"
              type="button"
              variant="secondary"
              onAction={() => {
                navigator.clipboard.writeText(qrCodeData.secret);
                toast.success('Secret copied to clipboard!');
              }}
            />
          </div>

          {error && <div className="text-critical mb-4">{error}</div>}

          <Area
            id="twoFaToken"
            coreComponents={[
              {
                component: { default: Field },
                props: {
                  name: 'token',
                  type: 'text',
                  label: '2FA Code',
                  placeholder: 'Enter 6-digit code',
                  validationRules: ['notEmpty'],
                  value: token,
                  onChange: (e) => setToken(e.target.value),
                  autoFocus: true,
                },
                sortOrder: 10,
              },
            ]}
            noOuter
          />

          <div className="flex gap-4 justify-end mt-4">
            {skipAllowed && (
              <Button
                title="Skip for now"
                variant="secondary"
                onAction={() => (window.location.href = dashboardUrl)}
              />
            )}
            <Button
            onAction={() => {              
              document
                .getElementById('verify2FaForm')
                .dispatchEvent(
                  new Event('submit', { cancelable: true, bubbles: true })
                );
            }}
            title='Verify'
          />
          </div>
        </Form>
      )}

      {step === 3 && recoveryCodes.length > 0 && (
        <div>
          <h2 className="text-2xl font-semibold mb-4">Recovery Codes</h2>
          <p className="mb-4">Save these codes somewhere safe. Each code can be used once to access your account if you lose access to your authenticator app.</p>

          <div className="grid grid-cols-2 gap-6 mb-4">
            {[
              recoveryCodes.slice(0, 5),
              recoveryCodes.slice(5, 10)
            ].map((column, colIndex) => (
              <ul key={colIndex} className="list-disc list-inside space-y-2">
                {column.map((code, index) => (
                  <li key={index} className="font-mono text-lg bg-gray-100 p-2 rounded">
                    {code}
                  </li>
                ))}
              </ul>
            ))}
          </div>
          <div className="flex gap-4 justify-end mt-4">
          <Button
            title="Download Recovery Codes"
            type="button"
            variant="secondary"
            onAction={() => {
              const textContent = recoveryCodes.join('\n');
              const blob = new Blob([textContent], { type: 'text/plain' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'recovery_codes.txt';
              a.click();
              URL.revokeObjectURL(url);
              toast.success('Recovery codes downloaded!');
            }}
          />

          <Button
            title="Finish"
            variant="primary"
            onAction={() => window.location.href = dashboardUrl}
          />
          </div>
        </div>
      )}
    </div>
  );
}

TwoFaSetupForm.propTypes = {
  setupUrl: PropTypes.string.isRequired,  
  dashboardUrl: PropTypes.string.isRequired
};

export const layout = {
  areaId: 'content',
  sortOrder: 10
};

export const query = `
  query Query {
    setupUrl: url(routeId: "setupTwoFa")
    verifyUrl: url(routeId: "verifyTwoFa")
    dashboardUrl: url(routeId: "dashboard")    
    user: adminUser(id: getContextValue('adminUserId')) {      
      twofaDeadline
    }
  }
`;
