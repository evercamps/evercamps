import { Field } from '@components/form/Field';
import { validator } from '@components/form/validator';
import React from 'react';
import { _ } from '@evercamps/evercamps/lib/locale/translate/_';
import { isValidNationalNumber, isTruthyFlag } from '../../../lib/nationalNumber.js';

interface Participant {
  nationalNumber?: string;
  nationalNumberNotApplicable?: boolean;
  [key: string]: any;
}

interface Props {
  participant?: Participant | null;
}

export default function NationalNumberField({ participant }: Props) {
  // `participant` is `null` (not `undefined`) on the "New Participant" page,
  // which a destructuring default wouldn't catch — see the null-safe `get()`
  // helper General.tsx uses for the same reason.
  const data = participant || {};
  const [skip, setSkip] = React.useState(isTruthyFlag(data.nationalNumberNotApplicable));
  // The rule handler reads this ref (not the `skip` state) so toggling the
  // checkbox takes effect immediately, even though Field only re-registers a
  // field's validationRules when its `value` prop changes, not on every render.
  const skipRef = React.useRef(skip);
  skipRef.current = skip;

  React.useEffect(() => {
    validator.addRule(
      'nationalNumber',
      (value: unknown) => skipRef.current || isValidNationalNumber(value),
      _('This is not a valid Belgian national number')
    );
  }, []);

  return (
    <div className="national-number-field">
      <Field
        name="national_number"
        type="text"
        label={_('National Number')}
        placeholder="YY.MM.DD-XXX.XX"
        value={data.nationalNumber || ''}
        validationRules={['nationalNumber']}
        disabled={skip}
      />
      <Field
        name="national_number_not_applicable"
        type="checkbox"
        label={_('Not applicable (participant is not a Belgian national)')}
        value="1"
        isChecked={skip}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSkip(e.target.checked)}
      />
    </div>
  );
}

export const layout = {
  areaId: 'participantEditGeneral',
  sortOrder: 25
};

export const query = `
  query Query {
    participant(id: getContextValue("participantUuid", null)) {
      nationalNumber
      nationalNumberNotApplicable
    }
  }
`;
