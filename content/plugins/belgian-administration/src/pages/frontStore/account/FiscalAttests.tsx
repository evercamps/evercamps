import React from 'react';
import { _ } from '@evercamps/evercamps/lib/locale/translate/_';

// "Fiscal attests" on the customer account page: the 281.86 attests made out
// to this customer, once the organiser uploaded them to Belcotax.

interface Attest {
  uuid: string;
  incomeYear: number;
  sequenceNumber: number;
  childName: string;
  totalAmount: number;
  downloadUrl: string;
}

interface Props {
  customer?: { fiscalAttests: Attest[] } | null;
}

function euro(amount: number) {
  return `€ ${amount.toLocaleString('nl-BE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function FiscalAttests({ customer }: Props) {
  const attests = customer?.fiscalAttests ?? [];
  if (attests.length === 0) {
    return null;
  }
  return (
    <div className="mt-8">
      <h2 className="text-xl font-semibold mb-2">{_('Fiscal attests')}</h2>
      <p className="text-textSubdued mb-4">
        {_('Attests for the childcare costs you paid (281.86). They were also sent to the tax authorities.')}
      </p>
      <table className="w-full text-left">
        <thead>
          <tr className="border-b">
            <th className="py-2">{_('Income year')}</th>
            <th className="py-2">{_('Child')}</th>
            <th className="py-2 text-right">{_('Amount')}</th>
            <th className="py-2" />
          </tr>
        </thead>
        <tbody>
          {attests.map((a) => (
            <tr key={a.uuid} className="border-b">
              <td className="py-2">{a.incomeYear}</td>
              <td className="py-2">{a.childName}</td>
              <td className="py-2 text-right">{euro(a.totalAmount)}</td>
              <td className="py-2 text-right">
                <a href={a.downloadUrl} className="text-interactive hover:underline">
                  {_('Download PDF')}
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export const layout = {
  areaId: 'accountPageOrderHistory',
  sortOrder: 40
};

export const query = `
  query Query {
    customer: currentCustomer {
      fiscalAttests {
        uuid
        incomeYear
        sequenceNumber
        childName
        totalAmount
        downloadUrl
      }
    }
  }
`;
