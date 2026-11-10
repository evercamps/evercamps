import { Card } from '@components/admin/cms/Card';
import Button from '@components/form/Button';
import Spinner from '@components/Spinner';
import axios from 'axios';
import React from 'react';
import { toast } from 'react-toastify';
import { useQuery } from 'urql';

const MergePairQuery = `
  query Query($aUuid: String!, $bUuid: String!) {
    a: participant(id: $aUuid) {
      participantId
      uuid
      firstName
      lastName
      birthDate
      editUrl
      customer { customerId fullName email }
      registrations {
        items { registrationId productId name sku variantTitle }
      }
    }
    b: participant(id: $bUuid) {
      participantId
      uuid
      firstName
      lastName
      birthDate
      editUrl
      customer { customerId fullName email }
      registrations {
        items { registrationId productId name sku variantTitle }
      }
    }
  }
`;

interface RegistrationItem {
  registrationId: number;
  productId: number;
  name: string;
  sku: string;
  variantTitle?: string | null;
}

interface ParticipantDetail {
  participantId: number;
  uuid: string;
  firstName: string;
  lastName: string;
  birthDate: string | null;
  editUrl: string;
  customer: { customerId: number; fullName: string; email: string } | null;
  registrations: { items: RegistrationItem[] };
}

interface ParticipantRef {
  uuid: string;
}

interface Props {
  participantA: ParticipantRef;
  participantB: ParticipantRef;
  mergeApi: string;
  closeModal: () => void;
}

type Side = 'a' | 'b';
type FieldKey = 'first_name' | 'last_name' | 'birth_date' | 'customer_id';

function productLabel(item: RegistrationItem): string {
  return item.variantTitle ? `${item.name} — ${item.variantTitle}` : item.name;
}

export default function ParticipantMergeForm({
  participantA,
  participantB,
  mergeApi,
  closeModal
}: Props) {
  const [result, reexecuteQuery] = useQuery({
    query: MergePairQuery,
    variables: { aUuid: participantA.uuid, bUuid: participantB.uuid },
    pause: true
  });
  const { data, error } = result;

  React.useEffect(() => {
    reexecuteQuery({ requestPolicy: 'network-only' });
  }, []);

  const [survivorSide, setSurvivorSide] = React.useState<Side>('a');
  const [fieldChoice, setFieldChoice] = React.useState<Partial<Record<FieldKey, Side>>>({});
  const [registrationChoice, setRegistrationChoice] = React.useState<Record<number, Side>>({});
  const [submitting, setSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  if (!data && !error) {
    return (
      <Card title="Review merge">
        <div className="modal-content">
          <Card.Session>
            <div className="p-3 flex justify-center">
              <Spinner width={25} height={25} />
            </div>
          </Card.Session>
        </div>
      </Card>
    );
  }

  if (error || !data?.a || !data?.b) {
    return (
      <Card title="Review merge">
        <div className="modal-content">
          <Card.Session>
            <div>Could not load these participants. {error?.message}</div>
          </Card.Session>
        </div>
        <Card.Session>
          <Button title="Close" variant="secondary" onAction={closeModal} />
        </Card.Session>
      </Card>
    );
  }

  const sides: Record<Side, ParticipantDetail> = { a: data.a, b: data.b };
  const otherSide = (side: Side): Side => (side === 'a' ? 'b' : 'a');
  const survivor = sides[survivorSide];
  const duplicate = sides[otherSide(survivorSide)];

  const fieldRows: {
    key: FieldKey;
    label: string;
    valueOf: (p: ParticipantDetail) => React.ReactNode;
  }[] = [
    { key: 'first_name', label: 'First name', valueOf: (p) => p.firstName },
    { key: 'last_name', label: 'Last name', valueOf: (p) => p.lastName },
    { key: 'birth_date', label: 'Birth date', valueOf: (p) => p.birthDate || '—' },
    {
      key: 'customer_id',
      label: 'Customer',
      valueOf: (p) => (p.customer ? `${p.customer.fullName} (${p.customer.email})` : 'No customer')
    }
  ];

  const registrationsByProduct = new Map<
    number,
    { productId: number; label: string; sides: Partial<Record<Side, RegistrationItem>> }
  >();
  (['a', 'b'] as Side[]).forEach((side) => {
    sides[side].registrations.items.forEach((item) => {
      const entry = registrationsByProduct.get(item.productId) ?? {
        productId: item.productId,
        label: productLabel(item),
        sides: {}
      };
      entry.sides[side] = item;
      registrationsByProduct.set(item.productId, entry);
    });
  });
  const allRegistrationRows = Array.from(registrationsByProduct.values());
  const collidingRows = allRegistrationRows.filter((row) => row.sides.a && row.sides.b);
  const soloRows = allRegistrationRows.filter((row) => !(row.sides.a && row.sides.b));

  const buildFields = (): Record<string, unknown> => {
    const fields: Record<string, unknown> = {
      first_name: sides[fieldChoice.first_name ?? survivorSide].firstName,
      last_name: sides[fieldChoice.last_name ?? survivorSide].lastName,
      customer_id: sides[fieldChoice.customer_id ?? survivorSide].customer?.customerId ?? null
    };
    const birthDate = sides[fieldChoice.birth_date ?? survivorSide].birthDate;
    if (birthDate) {
      fields.birth_date = birthDate;
    }
    return fields;
  };

  const buildRegistrationOverrides = (): Record<number, 'survivor' | 'duplicate'> => {
    const overrides: Record<number, 'survivor' | 'duplicate'> = {};
    collidingRows.forEach((row) => {
      const chosenSide = registrationChoice[row.productId] ?? survivorSide;
      overrides[row.productId] = chosenSide === survivorSide ? 'survivor' : 'duplicate';
    });
    return overrides;
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      await axios.post(mergeApi, {
        survivorUuid: survivor.uuid,
        duplicateUuid: duplicate.uuid,
        fields: buildFields(),
        registrationOverrides: buildRegistrationOverrides()
      });
      toast.success('Participants merged successfully!');
      setTimeout(() => {
        window.location.href = survivor.editUrl;
      }, 1000);
    } catch (e: any) {
      setSubmitError(
        e?.response?.data?.error?.message ?? 'Something went wrong. Please try again.'
      );
      setSubmitting(false);
    }
  };

  return (
    <Card title="Review merge">
      <div className="modal-content">
        <Card.Session>
          <p>
            Pick which participant survives the merge, then pick a winning value per field.
            The other participant and its unchosen data will be deleted — this can&apos;t be undone.
          </p>
        </Card.Session>
        <Card.Session>
          <table className="listing">
            <thead>
              <tr>
                <th />
                {(['a', 'b'] as Side[]).map((side) => (
                  <th key={side}>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="survivorSide"
                        checked={survivorSide === side}
                        onChange={() => setSurvivorSide(side)}
                      />
                      {sides[side].firstName} {sides[side].lastName}
                      {survivorSide === side ? ' (survivor)' : ''}
                    </label>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {fieldRows.map((row) => (
                <tr key={row.key}>
                  <td>{row.label}</td>
                  {(['a', 'b'] as Side[]).map((side) => (
                    <td key={side}>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name={`field-${row.key}`}
                          checked={(fieldChoice[row.key] ?? survivorSide) === side}
                          onChange={() =>
                            setFieldChoice((previous) => ({ ...previous, [row.key]: side }))
                          }
                        />
                        {row.valueOf(sides[side])}
                      </label>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </Card.Session>
        {collidingRows.length > 0 && (
          <Card.Session>
            <h4>Both are registered for the same product — pick which registration wins</h4>
            <table className="listing">
              <thead>
                <tr>
                  <th>Product</th>
                  {(['a', 'b'] as Side[]).map((side) => (
                    <th key={side}>{sides[side].firstName} {sides[side].lastName}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {collidingRows.map((row) => (
                  <tr key={row.productId}>
                    <td>{row.label}</td>
                    {(['a', 'b'] as Side[]).map((side) => (
                      <td key={side}>
                        <input
                          type="radio"
                          name={`registration-${row.productId}`}
                          checked={(registrationChoice[row.productId] ?? survivorSide) === side}
                          onChange={() =>
                            setRegistrationChoice((previous) => ({
                              ...previous,
                              [row.productId]: side
                            }))
                          }
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </Card.Session>
        )}
        {soloRows.length > 0 && (
          <Card.Session>
            <h4>Other registrations (will be kept, moving onto the survivor if needed)</h4>
            <ul>
              {soloRows.map((row) => (
                <li key={row.productId}>
                  {row.label} — {row.sides.a ? sides.a.firstName : sides.b.firstName}
                </li>
              ))}
            </ul>
          </Card.Session>
        )}
        {submitError && (
          <Card.Session>
            <div className="text-critical">{submitError}</div>
          </Card.Session>
        )}
      </div>
      <Card.Session>
        <div className="flex justify-end gap-4">
          <Button title="Cancel" variant="secondary" outline onAction={closeModal} />
          <Button title="Merge" onAction={handleSubmit} isLoading={submitting} />
        </div>
      </Card.Session>
    </Card>
  );
}
