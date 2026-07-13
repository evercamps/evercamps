import SettingMenu from '@components/admin/setting/SettingMenu';
import Area from '@components/common/Area';
import { Form } from '@components/common/form/Form';
import React from 'react';
import { toast } from 'react-toastify';

interface Props {
  saveSettingApi: string;
}

export default function PaymentSetting({ saveSettingApi }: Props) {
  return (
    <div className="main-content-inner">
      <div className="grid grid-cols-6 gap-x-8 grid-flow-row ">
        <div className="col-span-2">
          <SettingMenu />
        </div>
        <div className="col-span-4">
          <Form
            id="paymentSettingForm"
            method="POST"
            action={saveSettingApi}
            onSuccess={(response: any) => {
              if (!response.error) {
                toast.success('Setting saved');
              } else {
                toast.error(response.error.message);
              }
            }}
          >
            <Area id="paymentSetting" className="grid gap-8" />
          </Form>
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
    saveSettingApi: url(routeId: "saveSetting")
  }
`;
