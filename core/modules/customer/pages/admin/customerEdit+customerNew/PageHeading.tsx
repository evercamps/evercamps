import PageHeading from '@components/admin/cms/PageHeading';
import React from 'react';

interface Customer {
  fullName: string;
}

interface CustomerEditPageHeadingProps {
  backUrl: string;
  customer?: Customer | null;
}

export default function CustomerEditPageHeading({
  backUrl,
  customer = null
}: CustomerEditPageHeadingProps) {
  return (
    <PageHeading
      backUrl={backUrl}
      heading={
        customer
          ? `Editing ${customer.fullName}`
          : 'Create A New Customer'
      }
    />
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 5
};

export const query = `
  query Query {
    customer(id: getContextValue("customerUuid", null)) {
      fullName
    }
    backUrl: url(routeId: "customerGrid")
  }
`;