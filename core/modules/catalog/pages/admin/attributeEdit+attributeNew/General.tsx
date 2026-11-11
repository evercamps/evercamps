import { Card } from '@components/admin/cms/Card';
import Area from '@components/Area';
import { Field } from '@components/form/Field';
import { Input } from '@components/form/fields/Input';
import React from 'react';
import Select from 'react-select';
import { useQuery } from 'urql';
import { get } from '../../../../../lib/util/get.js';

interface GroupOption {
  value?: string | number;
  label?: string;
}

interface AttributeOption {
  optionId?: string | number;
  uuid?: string | number;
  optionText?: string;
  // Care period of the option, e.g. "Week 1 zomer" = 2026-07-06 .. 2026-07-10
  startDate?: string | null;
  endDate?: string | null;
  dayCount?: number | null;
}

interface Attribute {
  type?: string;
  attributeId?: string | number;
  attributeName?: string;
  attributeCode?: string;
  options?: AttributeOption[];
  groups?: {
    items?: GroupOption[];
  };
}

interface GroupsProps {
  groups: GroupOption[];
  createGroupApi: string;
}

interface OptionsProps {
  originOptions?: AttributeOption[];
}

interface GeneralProps {
  attribute?: Attribute | null;
  createGroupApi: string;
}

const GroupsQuery = `
  query Query {
    attributeGroups {
      items {
        value: attributeGroupId
        label: groupName
      }
    }
  }
`;

function Groups({ groups, createGroupApi }: GroupsProps) {
  const [result, reexecuteQuery] = useQuery({
    query: GroupsQuery
  });

  const newGroup = React.useRef<HTMLInputElement | null>(null);
  const [createGroupError, setCreateGroupError] = React.useState<
    string | undefined
  >(undefined);

  const { data, fetching, error } = result;

  const createGroup = () => {
    if (!newGroup.current?.value) {
      setCreateGroupError('Group name is required');
      return;
    }

    fetch(createGroupApi, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        group_name: newGroup.current.value
      })
    })
      .then((response) => response.json())
      .then((jsonData) => {
        if (!jsonData.error) {
          if (newGroup.current) {
            newGroup.current.value = '';
          }
          reexecuteQuery({ requestPolicy: 'network-only' });
        } else {
          setCreateGroupError(jsonData.error.message);
        }
      });
  };

  if (fetching) return <p>Loading...</p>;

  if (error) {
    return <p>Oh no...{error.message}</p>;
  }

  return (
    <div>
      <div className="mb-4">Select groups the attribute belongs to</div>

      <div className="grid gap-8 grid-cols-2">
        <div>
          <Select
            name="groups[]"
            options={data.attributeGroups.items}
            hideSelectedOptions
            isMulti
            defaultValue={groups}
          />
        </div>

        <div className="grid gap-8 grid-cols-1">
          <Input
            placeholder="Create a new group"
            ref={newGroup}
            error={createGroupError}
            suffix={
              <a
                className="text-interactive"
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  createGroup();
                }}
              >
                +
              </a>
            }
          />
        </div>
      </div>
    </div>
  );
}

function Options({ originOptions = [] }: OptionsProps) {
  const [options, setOptions] = React.useState<AttributeOption[]>(originOptions);

  const addOption = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();

    setOptions([
      ...options,
      {
        optionId: Math.floor(Math.random() * (9000000 - 1000000)) + 1000000,
        uuid: Math.floor(Math.random() * (9000000 - 1000000)) + 1000000,
        optionText: ''
      }
    ]);
  };

  const removeOption = (
    uuid: string | number | undefined,
    e: React.MouseEvent<HTMLAnchorElement>
  ) => {
    e.preventDefault();

    setOptions(options.filter((option) => option.uuid !== uuid));
  };

  return (
    <div className="attribute-edit-options">
      {options.length > 0 && (
        <div className="flex mb-2 space-x-8 text-textSubdued">
          <div className="w-1/3">Option</div>
          <div className="w-1/5">Start date</div>
          <div className="w-1/5">End date</div>
          <div className="w-1/12">Days</div>
        </div>
      )}
      {options.map((option, index) => (
        <div key={option.uuid} className="flex mb-2 space-x-8">
          <div className="w-1/3">
            <Field
              type="text"
              name={`options[${index}][option_text]`}
              value={option.optionText}
              validationRules={['notEmpty']}
            />

            <input
              type="hidden"
              name={`options[${index}][option_id]`}
              value={option.optionId}
            />
          </div>

          {/* Optional care period (e.g. a camp week). Used for display and
              the fiscal attests; leave empty for options that aren't periods. */}
          <div className="w-1/5">
            <Field
              type="date"
              name={`options[${index}][start_date]`}
              value={option.startDate ?? ''}
              placeholder="YYYY-MM-DD"
            />
          </div>
          <div className="w-1/5">
            <Field
              type="date"
              name={`options[${index}][end_date]`}
              value={option.endDate ?? ''}
              placeholder="YYYY-MM-DD"
            />
          </div>
          <div className="w-1/12">
            <Field
              type="text"
              name={`options[${index}][day_count]`}
              value={option.dayCount ?? ''}
              validationRules={['number']}
              placeholder="Auto"
            />
          </div>

          <div className="self-center">
            <a
              href="#"
              onClick={(e) => removeOption(option.uuid, e)}
              className="text-critical hover:underline"
            >
              Remove option
            </a>
          </div>
        </div>
      ))}

      <div className="mt-4">
        <a
          href="#"
          onClick={addOption}
          className="text-interactive hover:underline"
        >
          Add option
        </a>
      </div>
    </div>
  );
}

export default function General({
  attribute: attributeProp,
  createGroupApi
}: GeneralProps) {
  // `attribute` is null on the "New Attribute" page (attribute(id: null)).
  const attribute: Attribute = attributeProp ?? { type: 'text' };
  const [type, setType] = React.useState(attribute.type);

  const fields = [
    {
      component: { default: Field },
      props: {
        id: 'attributeName',
        name: 'attribute_name',
        label: 'Name',
        validationRules: ['notEmpty'],
        type: 'text'
      },
      sortOrder: 10
    },
    {
      component: { default: Field },
      props: {
        id: 'attributeCode',
        name: 'attribute_code',
        label: 'Attribute code',
        validationRules: ['notEmpty'],
        type: 'text'
      },
      sortOrder: 15
    },
    {
      component: { default: Field },
      props: {
        id: 'attributeId',
        name: 'attribute_id',
        type: 'hidden'
      },
      sortOrder: 10
    },
    {
      component: { default: Field },
      props: {
        id: 'type',
        type: 'radio',
        name: 'type',
        label: 'Type',
        options: [
          { value: 'text', text: 'Text' },
          { value: 'select', text: 'Select' },
          { value: 'multiselect', text: 'Multiselect' },
          { value: 'textarea', text: 'Textarea' }
        ],
        onChange: (value : any) => {
          setType(value);
        }
      },
      sortOrder: 20
    }
  ].map((f) => {
    // Prefill each field from the attribute (matched on the field's id, e.g.
    // attributeName / attributeCode / attributeId / type). This step was lost
    // in the TS conversion (#164), leaving the edit form empty.
    const value = get(attribute, f.props.id);
    if (value !== undefined) {
      (f.props as Record<string, unknown>).value = value;
    }
    return f;
  });

  return (
    <Card title="General">
      <Card.Session>
        <Area id="attributeEditGeneral" coreComponents={fields} />
      </Card.Session>

      {['select', 'multiselect'].includes(type ?? '') && (
        <Card.Session title="Attribute options">
          <Options originOptions={get(attribute, 'options', [])} />
        </Card.Session>
      )}

      <Card.Session title="Attribute Group">
        <Groups
          groups={get(attribute, 'groups.items', [])}
          createGroupApi={createGroupApi}
        />
      </Card.Session>
    </Card>
  );
}

export const layout = {
  areaId: 'leftSide',
  sortOrder: 10
};

export const query = `
  query Query {
    attribute(id: getContextValue("attributeId", null)) {
      attributeId
      attributeName
      attributeCode
      type
      options {
        optionId: attributeOptionId
        uuid
        optionText
        startDate
        endDate
        dayCount
      }
      groups {
        items {
          value: attributeGroupId
          label: groupName
        }
      }
    }
    createGroupApi: url(routeId: "createAttributeGroup")
  }
`;