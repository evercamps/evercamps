import { NavigationItemGroup } from '@components/admin/cms/NavigationItemGroup';
import ProductIcon from '@heroicons/react/solid/esm/ArchiveIcon';
import AttributeGroupIcon from '@heroicons/react/solid/esm/CollectionIcon';
import AttributeIcon from '@heroicons/react/solid/esm/HashtagIcon';
import CategoryIcon from '@heroicons/react/solid/esm/LinkIcon';
import CollectionIcon from '@heroicons/react/solid/esm/TagIcon';
import React from 'react';

interface CatalogMenuGroupProps {
  productGrid: string;
  categoryGrid: string;
  attributeGrid: string;
  attributeGroupGrid: string;
  collectionGrid: string;
}

export default function CatalogMenuGroup({
  productGrid,
  categoryGrid,
  attributeGrid,
  attributeGroupGrid,
  collectionGrid
}: CatalogMenuGroupProps) {
  return (
    <NavigationItemGroup
      id="catalogMenuGroup"
      name="Catalog"
      items={[
        {
          Icon: ProductIcon,
          url: productGrid,
          title: 'Products'
        },
        {
          Icon: CategoryIcon,
          url: categoryGrid,
          title: 'Categories'
        },
        {
          Icon: CollectionIcon,
          url: collectionGrid,
          title: 'Collections'
        },
        {
          Icon: AttributeIcon,
          url: attributeGrid,
          title: 'Attributes'
        },
        {
          Icon: AttributeGroupIcon,
          url: attributeGroupGrid,
          title: 'Attribute groups'
        }
      ]}
    />
  );
}

export const layout = {
  areaId: 'adminMenu',
  sortOrder: 20
};

export const query = `
  query Query {
    productGrid: url(routeId:"productGrid")
    categoryGrid: url(routeId:"categoryGrid")
    attributeGrid: url(routeId:"attributeGrid")
    attributeGroupGrid: url(routeId:"attributeGroupGrid")
    collectionGrid: url(routeId:"collectionGrid")
  }
`;