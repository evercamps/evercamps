import PageHeading from '@components/admin/cms/PageHeading';
import React from 'react';

interface AttributeGroupPageHeadingProps {
  backUrl: string;
  attributeGroup?: { groupName?: string } | null;
}

export default function AttributeGroupPageHeading({
  backUrl,
  attributeGroup
}: AttributeGroupPageHeadingProps) {
  // `attributeGroup` is null on the "New attribute group" page.
  return (
    <PageHeading
      backUrl={backUrl}
      heading={
        attributeGroup?.groupName
          ? `Editing ${attributeGroup.groupName}`
          : 'Create a new attribute group'
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
    attributeGroup(id: getContextValue("attributeGroupId", null)) {
      groupName
    }
    backUrl: url(routeId: "attributeGroupGrid")
  }
`;
