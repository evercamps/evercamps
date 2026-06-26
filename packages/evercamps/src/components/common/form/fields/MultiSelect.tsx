import Error from '@components/common/form/fields/Error';
import React from 'react';
import '../Field.scss';
import { _ } from '../../../../lib/locale/translate/_.js';

interface SelectOption {
  value: string | number;
  text: string;
}

interface MultiSelectProps {
  name?: string;
  label?: string;
  instruction?: string;
  error?: string;
  placeholder?: string;
  value?: string | number;
  onChange?: React.ChangeEventHandler<HTMLSelectElement>;
  options?: SelectOption[];
  ref?: React.Ref<HTMLSelectElement>;
}

function MultiSelect({ ref, ...props }: MultiSelectProps) {
  const {
    name,
    value,
    label,
    onChange,
    error,
    instruction,
    options = []
  } = props;

  return (
    <div className={`form-field-container dropdown ${error ? 'has-error' : null}`}>
      {label && <label htmlFor={name}>{label}</label>}
      <div className="field-wrapper flex flex-grow items-baseline">
        <select
          className="form-field"
          id={name}
          name={name}
          defaultValue={value}
          onChange={(e) => {
            if (onChange) onChange(e);
          }}
          ref={ref}
          multiple
        >
          <option value="" disabled>
            {_('Please select')}
          </option>
          {options.map((option, key) => (
            <option key={key} value={option.value}>
              {option.text}
            </option>
          ))}
        </select>
        <div className="field-border" />
        <div className="field-suffix">
          <svg
            viewBox="0 0 20 20"
            width="1rem"
            height="1.25rem"
            focusable="false"
            aria-hidden="true"
          >
            <path d="m10 16-4-4h8l-4 4zm0-12 4 4H6l4-4z" />
          </svg>
        </div>
      </div>
      {instruction && (
        <div className="field-instruction mt-sm">{instruction}</div>
      )}
      <Error error={error} />
    </div>
  );
}

export { MultiSelect };
