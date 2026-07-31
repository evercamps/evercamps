import AttributeNameRow from '@components/admin/catalog/attributeGrid/rows/AttributeName';
import GroupRow from '@components/admin/catalog/attributeGrid/rows/GroupRow';
import { Card } from '@components/admin/cms/Card';
import Area from '@components/Area';
import { Field } from '@components/form/Field';
import { Checkbox } from '@components/form/fields/Checkbox';
import { Form } from '@components/form/Form';
import DummyColumnHeader from '@components/grid/headers/Dummy';
import SortableHeader from '@components/grid/headers/Sortable';
import Pagination from '@components/grid/Pagination';
import BasicRow from '@components/grid/rows/BasicRow';
import YesNoRow from '@components/grid/rows/YesNoRow';
import { useAlertContext } from '@components/modal/Alert';
import axios from 'axios';
import React, { useState } from 'react';
import { toast } from 'react-toastify';

interface Filter {
  key: string;
  operation: string;
  value: string;
}

interface Group {
  attributeGroupId: string;
  groupName: string;
  updateApi: string;
}

interface Attribute {
  uuid: string;
  attributeId: string;
  attributeName: string;
  attributeCode: string;
  type: string;
  isRequired: number;
  isFilterable: number;
  editUrl: string;
  updateApi: string;
  deleteApi: string;
  groups?: {
    items?: Group[];
  };
}

interface AttributeResponse {
  items: Attribute[];
  total: number;
  currentFilters?: Filter[];
}

interface ActionsProps {
  attributes?: Attribute[];
  selectedIds?: string[];
}

function Actions({
  attributes = [],
  selectedIds = []
}: ActionsProps) {
  const { openAlert, closeAlert } = useAlertContext();
  const [isLoading, setIsLoading] = useState(false);

  const deleteAttributes = async () => {
    setIsLoading(true);

    try {
      const promises = attributes
        .filter((attribute) => selectedIds.includes(attribute.uuid))
        .map((attribute) =>
          axios.delete(attribute.deleteApi, {
            validateStatus: () => true
          })
        );

      const responses = await Promise.allSettled(promises);

      setIsLoading(false);

      responses.forEach((response) => {
        if (response.status === 'fulfilled') {
          if (response.value.status !== 200) {
            throw new Error(response.value.data.error.message);
          }
        }
      });

      window.location.reload();
    } catch (e) {
      setIsLoading(false);
      toast.error(e instanceof Error ? e.message : 'Unknown error');
    }
  };

  return (
    <tr>
      {selectedIds.length > 0 && (
        <td style={{ borderTop: 0 }} colSpan={100}>
          <div className="inline-flex border border-divider rounded justify-items-start">
            <a className="font-semibold pt-3 pb-3 pl-6 pr-6">
              {selectedIds.length} selected
            </a>

            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();

                openAlert({
                  heading: `Delete ${selectedIds.length} attributes`,
                  content: <div>Can&apos;t be undone</div>,
                  primaryAction: {
                    title: 'Cancel',
                    onAction: closeAlert,
                    variant: 'primary'
                  },
                  secondaryAction: {
                    title: 'Delete',
                    onAction: deleteAttributes,
                    variant: 'critical',
                    isLoading
                  }
                });
              }}
              className="font-semibold pt-3 pb-3 pl-6 pr-6 block border-l border-divider self-center"
            >
              Delete
            </a>
          </div>
        </td>
      )}
    </tr>
  );
}

interface AttributeGridProps {
  attributes: AttributeResponse;
}

export default function AttributeGrid({
  attributes: {
    items: attributes,
    total,
    currentFilters = []
  }
}: AttributeGridProps) {
  const pageFilter = currentFilters.find((f) => f.key === 'page');

  const limitFilter = currentFilters.find((f) => f.key === 'limit');

  const page = pageFilter ? parseInt(pageFilter.value, 10) : 1;
  const limit = limitFilter ? parseInt(limitFilter.value, 10) : 20;

  const [selectedRows, setSelectedRows] = useState<string[]>([]);

  return (
    <Card>
      ...
    </Card>
  );
}