import Error from '@components/common/form/fields/Error';
import React from 'react';
import flatpickr from './Flatpickr';
import '../Field.scss';

interface DateTimeProps {
  name: string;
  value?: string;
  label?: string;
  onChange?: (dateStr: string) => void;
  error?: string;
  suffix?: React.ReactNode;
  prefix?: React.ReactNode;
  placeholder?: string;
  instruction?: string;
  ref?: React.Ref<HTMLInputElement>;
}

function DateTime({ ref, name, value, label, onChange, error, suffix, prefix, placeholder, instruction }: DateTimeProps) {
  const localRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!localRef.current) return;
    const instance = flatpickr(localRef.current, { enableTime: true });
    instance.config.onChange.push((_selectedDates: unknown[], dateStr: string) => {
      if (onChange) onChange(dateStr);
    });
  }, []);

  const mergedRef = (node: HTMLInputElement | null) => {
    localRef.current = node;
    if (typeof ref === 'function') {
      ref(node);
    } else if (ref) {
      (ref as React.MutableRefObject<HTMLInputElement | null>).current = node;
    }
  };

  return (
    <div className={`form-field-container ${error ? 'has-error' : null}`}>
      {label && <label htmlFor={name}>{label}</label>}
      <div className="field-wrapper flex flex-grow">
        {prefix && <div className="field-prefix align-middle">{prefix}</div>}
        <input
          type="text"
          className="form-field"
          id={name}
          name={name}
          placeholder={placeholder}
          value={value}
          onChange={onChange as unknown as React.ChangeEventHandler<HTMLInputElement>}
          ref={mergedRef}
        />
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

export { DateTime };
