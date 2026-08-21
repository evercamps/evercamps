import { Card } from '@components/admin/cms/Card';
import { Field } from '@components/form/Field';
import React from 'react';

interface AttributeOption {
  optionId: number;
  optionText: string;
}

interface Attribute {
  attributeId: string;
  attributeName: string;
  attributeCode: string;
  type: string;
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
  variantGroupId?: string;
}

interface AttributesProps {
  product?: Product;
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
  product = {},
  groups: { items = [] }
}: AttributesProps) {
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

  return (
    <Card>
      <Card.Session title="Attribute group">
        <div>
          {product.variantGroupId && (
            <div>
              <input
                type="hidden"
                value={currentGroup.groupId}
                name="group_id"
              />
              <div className="border rounded border-divider p-4">
                <span>{currentGroup.groupName}</span>
              </div>
              <div className="italic text-textSubdued">
                Can not change the attribute group of a product that is already
                in a variant group.
              </div>
            </div>
          )}

          {!product.variantGroupId && (
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
          )}
        </div>
      </Card.Session>

      <Card.Session title="Attributes">
        <table className="table table-auto">
          <tbody>
            {currentGroup.attributes.items.map((attribute, index) => {
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
      variantGroupId
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
        attributes {
          items {
            attributeId
            attributeName
            attributeCode
            type
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