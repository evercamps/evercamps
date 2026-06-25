import { Card } from '@components/admin/cms/Card';
import Button from '@components/common/form/Button';
import { Field } from '@components/common/form/Field';

interface ParticipantCheckoutField {
  code: string;
  label: string;
  type: 'text' | 'date' | 'select';
  required: boolean;
  useForUniqueness: boolean;
}

interface BaseRegistration {
  firstName: string;
  lastName: string;
  extraData?: string;
}

interface Props<T extends BaseRegistration> {
  registration: T;
  setRegistration?: (registration: T) => void;
  loading?: boolean;
  onCancel: () => void;
  onSubmit: () => void;
  extraFields?: ParticipantCheckoutField[];
}

export default function EditParticipantForm<T extends BaseRegistration>({
  registration,
  setRegistration,
  loading,
  onCancel,
  onSubmit,
  extraFields = []
}: Props<T>) {
  const parsedExtraData = (): Record<string, string> => {
    try {
      return registration.extraData ? JSON.parse(registration.extraData) : {};
    } catch {
      return {};
    }
  };

  return (
    <Card title="Enter Participant Details">
      <Card.Session>
        <label className="block mb-2 font-medium">First Name</label>
        <div className="mb-8">
          <Field
            id="first_name"
            name="first_name"
            value={registration.firstName}
            placeholder="Enter First Name"
            type="text"
            validationRules={['notEmpty']}
            onChange={(e: any) =>
              setRegistration?.({ ...registration, firstName: e?.target?.value ?? e })
            }
          />
        </div>

        <label className="block mb-2 font-medium">Last Name</label>
        <div className="mb-2">
          <Field
            id="last_name"
            name="last_name"
            value={registration.lastName}
            placeholder="Enter Last Name"
            type="text"
            validationRules={['notEmpty']}
            onChange={(e: any) =>
              setRegistration?.({ ...registration, lastName: e?.target?.value ?? e })
            }
          />
        </div>

        {extraFields.map((field) => (
          <div key={field.code} className="mb-2">
            <label className="block mb-2 font-medium">{field.label}</label>
            <Field
              id={field.code}
              name={field.code}
              type="text"
              placeholder={field.type === 'date' ? 'YYYY-MM-DD' : undefined}
              value={parsedExtraData()[field.code] || ''}
              validationRules={field.required ? ['notEmpty'] : []}
              onChange={(e: any) => {
                const updated = { ...parsedExtraData(), [field.code]: e?.target?.value ?? e };
                setRegistration?.({ ...registration, extraData: JSON.stringify(updated) });
              }}
            />
          </div>
        ))}
      </Card.Session>

      <Card.Session>
        <div className="flex justify-between gap-8">
          <Button title="Cancel" variant="secondary" onAction={onCancel} />
          <Button title="Save" variant="primary" isLoading={loading} onAction={onSubmit} />
        </div>
      </Card.Session>
    </Card>
  );
}
