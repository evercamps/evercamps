import PageHeading from '@components/admin/cms/PageHeading';
import React from 'react';

interface Attribute {
  attributeName?: string;
}

interface AttributeEditPageHeadingProps {
  backUrl: string;
  attribute?: Attribute | null;
}

export default function AttributeEditPageHeading({
  backUrl,
  attribute
}: AttributeEditPageHeadingProps) {
  // `attribute` is null on the "New Attribute" page (attribute(id: null)).
  return (
    <PageHeading
      backUrl={backUrl}
      heading={
        attribute?.attributeName
          ? `Editing ${attribute.attributeName}`
          : 'Create a new attribute'
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
    attribute(id: getContextValue("attributeId", null)) {
      attributeName
    }
    backUrl: url(routeId: "attributeGrid")
  }
`;