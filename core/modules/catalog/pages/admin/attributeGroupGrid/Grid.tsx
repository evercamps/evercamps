import { Card } from '@components/admin/cms/Card';
import { useAlertContext } from '@components/modal/Alert';
import axios from 'axios';
import React from 'react';
import { toast } from 'react-toastify';
import { DEFAULT_ATTRIBUTE_GROUP_ID } from '../../../services/attributeGroup/defaultGroup.js';

// Attribute groups are kinds of product (ADR-0003). The default group and
// groups that still have products can't be deleted.

interface AttributeGroup {
  attributeGroupId: string;
  uuid: string;
  groupName: string;
  editUrl: string;
  deleteApi: string;
  productCount: number;
  attributes: {
    total: number;
  };
}

interface AttributeGroupGridProps {
  attributeGroups: {
    items: AttributeGroup[];
  } | null;
}

function deleteBlockedReason(group: AttributeGroup): string | null {
  if (parseInt(group.attributeGroupId, 10) === DEFAULT_ATTRIBUTE_GROUP_ID) {
    return 'The default attribute group can not be deleted';
  }
  if (group.productCount > 0) {
    return `Has ${group.productCount} product${group.productCount === 1 ? '' : 's'}: move them to another group first`;
  }
  return null;
}

export default function AttributeGroupGrid({ attributeGroups }: AttributeGroupGridProps) {
  const { openAlert, closeAlert } = useAlertContext();
  const groups = attributeGroups?.items ?? [];

  const remove = async (group: AttributeGroup) => {
    const response = await axios.delete(group.deleteApi, { validateStatus: () => true });
    closeAlert();
    if (response.status !== 200) {
      toast.error(response.data?.error?.message ?? 'Could not delete the attribute group');
      return;
    }
    window.location.reload();
  };

  const confirmRemove = (group: AttributeGroup) =>
    openAlert({
      heading: `Delete ${group.groupName}`,
      content: <div>Can&apos;t be undone</div>,
      primaryAction: { title: 'Cancel', onAction: closeAlert, variant: 'primary' },
      secondaryAction: { title: 'Delete', onAction: () => remove(group), variant: 'critical' }
    });

  return (
    <Card>
      <table className="listing sticky">
        <thead>
          <tr>
            <th>Name</th>
            <th>Attributes</th>
            <th>Products</th>
            <th aria-label="Actions" />
          </tr>
        </thead>
        <tbody>
          {groups.map((group) => {
            const blocked = deleteBlockedReason(group);
            return (
              <tr key={group.uuid}>
                <td>
                  <a className="hover:underline font-semibold" href={group.editUrl}>
                    {group.groupName}
                  </a>
                </td>
                <td>{group.attributes?.total ?? 0}</td>
                <td>{group.productCount}</td>
                <td className="text-right">
                  {blocked ? (
                    <span className="text-textSubdued cursor-not-allowed" title={blocked}>
                      Delete
                    </span>
                  ) : (
                    <a
                      href="#"
                      className="text-critical hover:underline"
                      onClick={(e) => {
                        e.preventDefault();
                        confirmRemove(group);
                      }}
                    >
                      Delete
                    </a>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {groups.length === 0 && (
        <div className="flex w-full justify-center">There is no attribute group to display</div>
      )}
    </Card>
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 20
};

export const query = `
  query Query {
    attributeGroups(filters: [{ key: "ob", operation: "eq", value: "name" }]) {
      items {
        attributeGroupId
        uuid
        groupName
        editUrl
        deleteApi
        productCount
        attributes(filters: [{ key: "limit", operation: "eq", value: 1 }]) {
          total
        }
      }
    }
  }
`;
