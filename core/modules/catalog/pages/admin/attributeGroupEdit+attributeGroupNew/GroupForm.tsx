import { Card } from '@components/admin/cms/Card';
import Button from '@components/form/Button';
import { Input } from '@components/form/fields/Input';
import { useAlertContext } from '@components/modal/Alert';
import axios from 'axios';
import React from 'react';
import Select from 'react-select';
import { toast } from 'react-toastify';
import type { AttributeRole } from '../../../services/attribute/attributeRole.js';

// An attribute group is a kind of product (ADR-0003). It decides which product
// attributes and variant attributes (ADR-0004) its products can have.
//
// Removing a product attribute deletes its values on the group's products, so
// that asks for confirmation first. Removing a variant attribute that variants
// in the group use is refused by the server; its message is shown as is.

interface AttributeRow {
  attributeId: string;
  attributeName: string;
  attributeCode: string;
  role: AttributeRole;
}

interface Usage {
  attributeId: number;
  productValueCount: number;
  variantValueCount: number;
}

interface AttributeGroup {
  uuid: string;
  groupName: string;
  updateApi: string;
  attributes: { items: { attributeId: string }[] };
  attributeUsage: Usage[];
}

interface GroupFormProps {
  attributeGroup: AttributeGroup | null;
  allAttributes: { items: AttributeRow[] };
  createApi: string;
  gridUrl: string;
}

interface Option {
  value: number;
  label: string;
}

const toOption = (attribute: AttributeRow): Option => ({
  value: Number(attribute.attributeId),
  label: attribute.attributeName
});

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;

export default function GroupForm({ attributeGroup, allAttributes, createApi, gridUrl }: GroupFormProps) {
  const { openAlert, closeAlert } = useAlertContext();
  const attributes = [...(allAttributes?.items ?? [])].sort((a, b) =>
    a.attributeName.localeCompare(b.attributeName, 'nl', { numeric: true })
  );
  const usage = new Map((attributeGroup?.attributeUsage ?? []).map((u) => [u.attributeId, u]));
  const original = (attributeGroup?.attributes.items ?? []).map((a) => Number(a.attributeId));

  const [name, setName] = React.useState(attributeGroup?.groupName ?? '');
  const [nameError, setNameError] = React.useState<string | undefined>(undefined);
  const [selected, setSelected] = React.useState<number[]>(original);
  const [saving, setSaving] = React.useState(false);

  const ofRole = (role: AttributeRow['role']) => attributes.filter((a) => a.role === role);
  const selectedOf = (role: AttributeRow['role']) =>
    ofRole(role).filter((a) => selected.includes(Number(a.attributeId))).map(toOption);
  const setRole = (role: AttributeRow['role'], options: readonly Option[]) => {
    const otherRole = ofRole(role === 'product' ? 'variant' : 'product').map((a) => Number(a.attributeId));
    setSelected([...selected.filter((id) => otherRole.includes(id)), ...options.map((o) => o.value)]);
  };

  const submit = async () => {
    setSaving(true);
    closeAlert();
    const payload = { group_name: name.trim(), attributes: selected };
    const response = attributeGroup
      ? await axios.patch(attributeGroup.updateApi, payload, { validateStatus: () => true })
      : await axios.post(createApi, payload, { validateStatus: () => true });
    setSaving(false);
    if (response.status !== 200 || response.data?.error) {
      toast.error(response.data?.error?.message ?? 'Could not save the attribute group');
      return;
    }
    if (attributeGroup) {
      toast.success('Attribute group saved');
      window.location.reload();
    } else {
      window.location.href = response.data.data.editUrl ?? gridUrl;
    }
  };

  const save = () => {
    if (!name.trim()) {
      setNameError('Group name is required');
      return;
    }
    setNameError(undefined);

    // Product attributes with values that would be deleted.
    const losing = ofRole('product')
      .filter((a) => original.includes(Number(a.attributeId)) && !selected.includes(Number(a.attributeId)))
      .map((a) => ({ attribute: a, count: usage.get(Number(a.attributeId))?.productValueCount ?? 0 }))
      .filter(({ count }) => count > 0);

    if (losing.length === 0) {
      submit();
      return;
    }
    openAlert({
      heading: 'Remove product attributes',
      content: (
        <div>
          <p className="mb-2">The values of these attributes are deleted from the products in this group:</p>
          <ul className="list-disc pl-6">
            {losing.map(({ attribute, count }) => (
              <li key={attribute.attributeId}>
                {attribute.attributeName}: {plural(count, 'value')}
              </li>
            ))}
          </ul>
          <p className="mt-2">This can&apos;t be undone.</p>
        </div>
      ),
      primaryAction: { title: 'Cancel', onAction: closeAlert, variant: 'primary' },
      secondaryAction: { title: 'Remove and save', onAction: submit, variant: 'critical' }
    });
  };

  const variantInUse = ofRole('variant')
    .filter((a) => (usage.get(Number(a.attributeId))?.variantValueCount ?? 0) > 0)
    .map((a) => a.attributeName);

  return (
    <>
      <div className="grid grid-cols-1 gap-8">
        <Card title="General">
          <Card.Session>
            <Input
              name="group_name"
              label="Name"
              placeholder="e.g. Day camp"
              value={name}
              error={nameError}
              onChange={(e) => setName(e.target.value)}
            />
          </Card.Session>
        </Card>

        <Card title="Product attributes">
          <Card.Session>
            <div className="mb-2 text-textSubdued">
              Describe the whole product, the same for all its variants. Removing one deletes its values on
              the products in this group.
            </div>
            <Select
              isMulti
              hideSelectedOptions
              options={ofRole('product').map(toOption)}
              value={selectedOf('product')}
              onChange={(options) => setRole('product', options)}
            />
          </Card.Session>
        </Card>

        <Card title="Variant attributes">
          <Card.Session>
            <div className="mb-2 text-textSubdued">
              Tell the variants of a product apart, e.g. camp week.
              {variantInUse.length > 0 && (
                <> In use by variants, so they can&apos;t be removed: {variantInUse.join(', ')}.</>
              )}
            </div>
            <Select
              isMulti
              hideSelectedOptions
              options={ofRole('variant').map(toOption)}
              value={selectedOf('variant')}
              onChange={(options) => setRole('variant', options)}
            />
          </Card.Session>
        </Card>
      </div>

      <div className="form-submit-button flex border-t border-divider mt-6 pt-6 justify-between">
        <Button
          title="Cancel"
          variant="critical"
          outline
          onAction={() => {
            window.location.href = gridUrl;
          }}
        />
        <Button title="Save" onAction={save} isLoading={saving} />
      </div>
    </>
  );
}

export const layout = {
  areaId: 'content',
  sortOrder: 10
};

export const query = `
  query Query {
    attributeGroup(id: getContextValue("attributeGroupId", null)) {
      uuid
      groupName
      updateApi
      attributes(filters: [{ key: "limit", operation: eq, value: 1000 }]) {
        items {
          attributeId
        }
      }
      attributeUsage {
        attributeId
        productValueCount
        variantValueCount
      }
    }
    allAttributes: attributes(filters: [{ key: "limit", operation: eq, value: 1000 }]) {
      items {
        attributeId
        attributeName
        attributeCode
        role
      }
    }
    createApi: url(routeId: "createAttributeGroup")
    gridUrl: url(routeId: "attributeGroupGrid")
  }
`;
