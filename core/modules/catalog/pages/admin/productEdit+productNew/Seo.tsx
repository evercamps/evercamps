import { Card } from '@components/admin/cms/Card';
import Area from '@components/Area';
import { Field } from '@components/form/Field';
import React from 'react';
import { get } from '../../../../../lib/util/get.js';

interface Product {
  urlKey?: string;
  metaTitle?: string;
  metaKeywords?: string;
  metaDescription?: string;
}

interface SEOProps {
  product?: Product;
}

interface SEOField {
  component: {
    default: typeof Field;
  };
  props: {
    id: string;
    name: string;
    label: string;
    type: string;
    validationRules?: string[];
    value?: string;
  };
  sortOrder: number;
}

export default function SEO({
  product = {
    urlKey: '',
    metaTitle: '',
    metaKeywords: '',
    metaDescription: ''
  }
}: SEOProps) {
  const fieldsDefinition: SEOField[] = [
  {
      component: { default: Field },
      props: {
        id: 'urlKey',
        name: 'url_key',
        label: 'Url key',
        validationRules: ['notEmpty'],
        type: 'text'
      },
      sortOrder: 0
    },
    {
      component: { default: Field },
      props: {
        id: 'metaTitle',
        name: 'meta_title',
        label: 'Meta title',
        type: 'text'
      },
      sortOrder: 10
    },
    {
      component: { default: Field },
      props: {
        id: 'metaKeywords',
        name: 'meta_keywords',
        label: 'Meta keywords',
        type: 'text'
      },
      sortOrder: 20
    },
    {
      component: { default: Field },
      props: {
        id: 'metaDescription',
        name: 'meta_description',
        label: 'Meta description',
        type: 'textarea'
      },
      sortOrder: 30
    }
  ];

  const fields = fieldsDefinition.map((f) => {
    const value = get(product, f.props.id);

    if (value !== undefined) {
      f.props.value = value;
    }

    return f;
  });

  return (
    <Card title="Search engine optimize">
      <Card.Session>
        <Area id="productEditSeo" coreComponents={fields} />
      </Card.Session>
    </Card>
  );
}

export const layout = {
  areaId: 'leftSide',
  sortOrder: 60
};

export const query = `
  query Query {
    product(id: getContextValue('productId', null)) {
      urlKey
      metaTitle
      metaKeywords
      metaDescription
    }
  }
`;