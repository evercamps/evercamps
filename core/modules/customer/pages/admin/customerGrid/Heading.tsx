import PageHeading from '@components/admin/cms/PageHeading';
import React from 'react';

export default function Heading(): React.ReactElement {
  return (
    <PageHeading
      backUrl={null}
      heading="Customers"
    />
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 10
};