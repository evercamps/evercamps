import { Card } from '@components/admin/cms/Card';
import Area from '@components/Area';
import { Field } from '@components/form/Field';
import React from 'react';
import { get } from '../../../../../lib/util/get.js';

interface Category {
  metaDescription?: string;
  metaKeywords?: string;
  metaTitle?: string;
  urlKey?: string;
}

interface SeoProps {
  category?: Category;
}

interface FieldConfig {
  component: {
    default: React.ComponentType<any>;
  };
  props: {
    id: string;
    name?: string;
    label?: string;
    type?: string;
    validationRules?: string[];
    options?: {
      value: number;
      text: string;
    }[];
    value?: unknown;
  };
  sortOrder: number;
}

export default function Seo({ category = {} }: SeoProps) {
  const fields: FieldConfig[] = [
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
        id: 'metakeywords',
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

  const fieldsWithValues = fields.map((f): FieldConfig => {
    const value = get(category, f.props.id);

    if (value !== undefined) {
      f.props.value = value;
    }

    return f;
  });

  return (
    <Card title="Search engine optimize">
      <Card.Session>
        <Area id="categoryEditSeo" coreComponents={fieldsWithValues} />
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
    category(id: getContextValue('categoryId', null)) {
      urlKey
      metaTitle
      metaKeywords
      metaDescription
    }
  }
`;