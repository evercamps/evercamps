import Error from '@components/common/form/fields/Error';
import React from 'react';
import '../Field.scss';

interface PasswordProps {
  name?: string;
  label?: string;
  instruction?: string;
  prefix?: React.ReactNode;
  suffix?: string;
  error?: string;
  value?: string | number;
  ref?: React.Ref<HTMLInputElement>;
  autocomplete?: string;
  autofocus?: boolean;
  dirname?: string;
  disabled?: boolean;
  form?: string;
  maxlength?: number;
  minlength?: number;
  pattern?: string;
  placeholder?: string;
  readonly?: boolean;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  onFocus?: React.FocusEventHandler<HTMLInputElement>;
  onBlur?: React.FocusEventHandler<HTMLInputElement>;
  onKeyPress?: React.KeyboardEventHandler<HTMLInputElement>;
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>;
  onKeyUp?: React.KeyboardEventHandler<HTMLInputElement>;
}

const inputProps = (props: PasswordProps): Record<string, unknown> => {
  const obj: Record<string, unknown> = {};
  [
    'autocomplete', 'autofocus', 'dirname', 'disabled', 'form',
    'maxlength', 'minlength', 'name', 'pattern', 'placeholder',
    'readonly', 'onChange', 'onFocus', 'onBlur', 'onKeyPress',
    'onKeyDown', 'onKeyUp'
  ].forEach((a) => {
    if ((props as Record<string, unknown>)[a]) {
      obj[a] = (props as Record<string, unknown>)[a];
    }
  });
  obj.defaultValue = props.value;
  return obj;
};

function Password({ ref, ...props }: PasswordProps) {
  const { label, name, instruction, prefix, suffix, error } = props;
  return (
    <div className={`form-field-container ${error ? 'has-error' : null}`}>
      {label && <label htmlFor={name}>{label}</label>}
      <div className="field-wrapper flex flex-grow">
        {prefix && <div className="field-prefix align-middle">{prefix}</div>}
        <input type="password" {...(inputProps(props) as React.InputHTMLAttributes<HTMLInputElement>)} ref={ref} />
        <div className="field-border" />
        {suffix && <div className="field-suffix">{suffix}</div>}
      </div>
      {instruction && (
        <div className="field-instruction mt-sm">{instruction}</div>
      )}
      <Error error={error} />
    </div>
  );
}

export { Password };
