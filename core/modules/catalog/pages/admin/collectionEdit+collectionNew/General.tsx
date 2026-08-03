import { Card } from '@components/admin/cms/Card';
import Area from '@components/Area';
import { Field } from '@components/form/Field';
import Editor from '@components/form/fields/Editor';
import React from 'react';
import { get } from '../../../../../lib/util/get.js';

interface Collection {
  collectionId?: number;
  name?: string;
  code?: string;
  description?: unknown;
}

interface GeneralProps {
  collection?: Collection;
  browserApi: string;
  deleteApi: string;
  uploadApi: string;
  folderCreateApi: string;
}

interface FieldConfig {
  component: {
    default: React.ComponentType<any>;
  };
  props: {
    id: string;
    name?: string;
    label?: string;
    validationRules?: string[];
    placeholder?: string;
    type?: string;
    value?: unknown;
    browserApi?: string;
    deleteApi?: string;
    uploadApi?: string;
    folderCreateApi?: string;
  };
  sortOrder: number;
}

export default function General({
  collection = {},
  browserApi,
  deleteApi,
  uploadApi,
  folderCreateApi
}: GeneralProps) {
    const fieldDefinitions: FieldConfig[] = [
    {
      component: { default: Field },
      props: {
        id: 'name',
        name: 'name',
        label: 'Name',
        validationRules: ['notEmpty'],
        placeholder: 'Featured Products',
        type: 'text'
      },
      sortOrder: 10
    },
    {
      component: { default: Field },
      props: {
        id: 'code',
        name: 'code',
        label: 'Unique ID',
        validationRules: ['notEmpty'],
        placeholder: 'featuredProducts',
        type: 'text'
      },
      sortOrder: 15
    },
    {
      component: { default: Field },
      props: {
        id: 'collectionId',
        name: 'collection_id',
        type: 'hidden'
      },
      sortOrder: 10
    },
    {
      component: { default: Editor },
      props: {
        id: 'description',
        name: 'description',
        label: 'Description',
        browserApi,
        deleteApi,
        uploadApi,
        folderCreateApi
      },
      sortOrder: 30
    }
  ];

  const fields = fieldDefinitions.map((f) => {
    const value = get(collection, f.props.id);

    if (value !== undefined) {
      f.props.value = value;
    }

    return f;
  });

  return (
    <Card title="General">
      <Card.Session>
        <Area id="collectionEditGeneral" coreComponents={fields} />
      </Card.Session>
    </Card>
  );
}

export const layout = {
  areaId: 'collectionFormInner',
  sortOrder: 10
};

export const query = `
  query Query {
    collection(code: getContextValue("collectionCode", null)) {
      collectionId
      name
      code
      description
    }
    browserApi: url(routeId: "fileBrowser", params: [{key: "0", value: ""}])
    deleteApi: url(routeId: "fileDelete", params: [{key: "0", value: ""}])
    uploadApi: url(routeId: "imageUpload", params: [{key: "0", value: ""}])
    folderCreateApi: url(routeId: "folderCreate")
  }
`;