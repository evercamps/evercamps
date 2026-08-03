import PageHeading from '@components/admin/cms/PageHeading';
import React from 'react';

interface Category {
  name?: string;
}

interface CategoryEditPageHeadingProps {
  backUrl: string;
  category?: Category;
}

export default function CategoryEditPageHeading({
  backUrl,
  category = {}
}: CategoryEditPageHeadingProps) {
  return (
    <PageHeading
      backUrl={backUrl}
      heading={
        category
          ? `Editing ${category.name}`
          : 'Create a new category'
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
    category(id: getContextValue("categoryId", null)) {
      name
    }
    backUrl: url(routeId: "categoryGrid")
  }
`;