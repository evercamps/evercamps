import { Card } from '@components/admin/cms/Card';
import { Field } from '@components/form/Field';
import React from 'react';
import type { AttributeRole } from '../../../services/attribute/attributeRole.js';

interface AttributeOption {
  optionId: number;
  optionText: string;
}

interface Attribute {
  attributeId: string;
  attributeName: string;
  attributeCode: string;
  type: string;
  // ADR-0004: variant attributes (e.g. camp week) are set per variant in the
  // Variants card, never on the product.
  role: AttributeRole;
  isRequired: number;
  options: AttributeOption[];
}

interface AttributeGroup {
  groupId: string;
  groupName: string;
  attributes: {
    items: Attribute[];
  };
}

interface AttributeGroups {
  items: AttributeGroup[];
}

interface AttributeIndex {
  attributeId: string;
  optionId?: number;
  optionText?: string;
}

interface Product {
  attributeIndex?: AttributeIndex[];
  groupId?: string;
  // ADR-0003: locked once a variant has a value for a variant attribute.
  attributeGroupLock?: {
    locked: boolean;
    reason: string | null;
  };
}

interface AttributesProps {
  product?: Product | null;
  groups: AttributeGroups;
}

const getGroup = (
  groups: AttributeGroup[] = [],
  groupId: string | undefined | null = null
): AttributeGroup | undefined =>
  groups.find(
    (group) => parseInt(group.groupId, 10) === parseInt(groupId ?? '', 10)
  ) || groups[0];

export default function Attributes({
  product: productProp,
  groups: { items = [] }
}: AttributesProps) {
  // `product` is `null` on the "New Product" page (product(id: null)).
  const product = productProp ?? {};
  const attributeIndex = product.attributeIndex || [];
  const groupId = product.groupId;

  const [currentGroup, setCurrentGroup] = React.useState<
    AttributeGroup | undefined
  >(getGroup(items, groupId));

  const handleGroupChange = (value: unknown): void => {
    setCurrentGroup(getGroup(items, String(value)));
  };

  if (!currentGroup) {
    return null;
  }

  const lock = product.attributeGroupLock;
  // Only an existing product has values that a group change can remove.
  const groupChanged =
    groupId !== undefined && groupId !== null && parseInt(String(groupId), 10) !== parseInt(currentGroup.groupId, 10);
  const productAttributes = currentGroup.attributes.items.filter((attribute) => attribute.role !== 'variant');

  return (
    <Card>
      <Card.Session title="Attribute group">
        {lock?.locked ? (
          // Not posted: the group can't change (the database refuses it too).
          <div>
            <div className="font-semibold">{currentGroup.groupName}</div>
            <div className="text-textSubdued text-sm">
              Locked: {lock.reason}. The attribute group can&apos;t change any more.
            </div>
          </div>
        ) : (
          <div>
            <Field
              name="group_id"
              value={currentGroup.groupId}
              onChange={handleGroupChange}
              options={items.map((g) => ({
                value: parseInt(g.groupId, 10),
                text: g.groupName
              }))}
              type="select"
            />
            {groupChanged && (
              <div className="text-critical text-sm mt-2">
                Saving removes this product&apos;s attribute values that aren&apos;t in {currentGroup.groupName}.
              </div>
            )}
          </div>
        )}
      </Card.Session>

      <Card.Session title="Attributes">
        {productAttributes.length === 0 && (
          <div className="text-textSubdued">This attribute group has no product attributes.</div>
        )}
        <table className="table table-auto">
          <tbody>
            {productAttributes.map((attribute, index) => {
              const valueIndex = attributeIndex.find(
                (idx) => idx.attributeId === attribute.attributeId
              );

              const valueIndexMulti = attributeIndex.filter(
                (idx) => idx.attributeId === attribute.attributeId
              );

              let field: React.ReactNode = null;

              const validationRules =
                parseInt(String(attribute.isRequired), 10) === 1
                  ? ['notEmpty']
                  : [];

              switch (attribute.type) {
                case 'text':
                case 'date':
                case 'datetime':
                case 'textarea':
                  field = (
                    <Field
                      name={`attributes[${index}][value]`}
                      value={valueIndex?.optionText}
                      validationRules={validationRules}
                      type={attribute.type}
                    />
                  );
                  break;

                case 'select':
                case 'period':
                  field = (
                    <Field
                      name={`attributes[${index}][value]`}
                      value={valueIndex?.optionId}
                      options={attribute.options.map((o) => ({
                        value: o.optionId,
                        text: o.optionText
                      }))}
                      validationRules={validationRules}
                      type="select"
                    />
                  );
                  break;

                case 'multiselect':
                  field = (
                    <Field
                      name={`attributes[${index}][value][]`}
                      value={valueIndexMulti
                        .map((i) => i.optionId)
                        .filter((id): id is number => id !== undefined)}
                      options={attribute.options.map((o) => ({
                        value: o.optionId,
                        text: o.optionText
                      }))}
                      validationRules={validationRules}
                      type="multiselect"
                    />
                  );
                  break;

                default:
                  field = (
                    <Field
                      name={`attributes[${index}][value]`}
                      value={valueIndex?.optionText}
                      validationRules={validationRules}
                      type="text"
                    />
                  );
              }

              return (
                <tr key={attribute.attributeCode}>
                  <td>{attribute.attributeName}</td>
                  <td>
                    <input
                      type="hidden"
                      value={attribute.attributeCode}
                      name={`attributes[${index}][attribute_code]`}
                    />
                    {field}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card.Session>
    </Card>
  );
}

export const layout = {
  areaId: 'rightSide',
  sortOrder: 30
};

export const query = `
  query Query ($filters: [FilterInput!]) {
    product(id: getContextValue("productId", null)) {
      groupId
      attributeGroupLock {
        locked
        reason
      }
      attributeIndex {
        attributeId
        optionId
        optionText
      }
    },
    groups: attributeGroups(filters: $filters) {
      items {
        groupId: attributeGroupId
        groupName
        attributes(filters: [{ key: "limit", operation: eq, value: 1000 }]) {
          items {
            attributeId
            attributeName
            attributeCode
            type
            role
            isRequired
            options {
              optionId: attributeOptionId
              optionText
            }
          }
        }
      }
    }
  }
`;

export const variables = `
{
  filters: [{ key: "limit", operation: "eq", value: 1000 }]
}
`;