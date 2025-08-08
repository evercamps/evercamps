import { Card } from '@components/admin/cms/Card';
import { Field } from '@components/common/form/Field';
import { Toggle } from '@components/common/form/fields/Toggle';
import PropTypes from 'prop-types';
import React from 'react';

export default function MolliePayment({
  setting: {
    molliePaymentStatus,
    mollieDisplayName,
    molliePaymentMode,
    mollieTestApiKey,
    mollieLiveApiKey,
  }
}) {
  return (
    <Card title="Mollie Payment">
      <Card.Session>
        <div className="grid grid-cols-3 gap-8">
          <div className="col-span-1 items-center flex">
            <h4>Enable?</h4>
          </div>
          <div className="col-span-2">
            <Toggle name="molliePaymentStatus" value={molliePaymentStatus} />
          </div>
        </div>
      </Card.Session>
      <Card.Session>
        <div className="grid grid-cols-3 gap-8">
          <div className="col-span-1 items-center flex">
            <h4>Display Name</h4>
          </div>
          <div className="col-span-2">
            <Field
              type="text"
              name="mollieDisplayName"
              placeholder="Display Name"
              value={mollieDisplayName}
            />
          </div>
        </div>
      </Card.Session>
      <Card.Session>
        <div className="grid grid-cols-3 gap-8">
          <div className="col-span-1 items-center flex">
            <h4>Active Live Mode?</h4>
          </div>
          <div className="col-span-2">
            <Toggle name="molliePaymentMode" value={molliePaymentMode} />
          </div>
        </div>
      </Card.Session>
      <Card.Session>
        <div className="grid grid-cols-3 gap-8">
          <div className="col-span-1 items-center flex">
            <h4>Live Api key</h4>
          </div>
          <div className="col-span-2">
            <Field
              type="text"
              name="mollieLiveApiKey"
              placeholder="live api Key"
              value={mollieLiveApiKey}
              instruction="Your webhook url should be: https://yourdomain.com/api/mollie/webhook"
            />
          </div>
        </div>
      </Card.Session>
      <Card.Session>
        <div className="grid grid-cols-3 gap-8">
          <div className="col-span-1 items-center flex">
            <h4>Test Api Key</h4>
          </div>
          <div className="col-span-2">
            <Field
              type="text"
              name="mollieTestApiKey"
              placeholder="Test api key"
              value={mollieTestApiKey}
            />
          </div>
        </div>
      </Card.Session>
    </Card>
  );
}

MolliePayment.propTypes = {
  setting: PropTypes.shape({
    molliePaymentStatus: PropTypes.number,
    mollieDisplayName: PropTypes.string,
    molliePaymentMode: PropTypes.number,
    mollieLiveApiKey: PropTypes.string,
    mollieTestApiKey: PropTypes.string,
  }).isRequired
};

export const layout = {
  areaId: 'paymentSetting',
  sortOrder: 10
};

export const query = `
  query Query {
    setting {
      mollieDisplayName
      molliePaymentStatus
      molliePaymentMode
      mollieLiveApiKey
      mollieTestApiKey
    }
  }
`;
