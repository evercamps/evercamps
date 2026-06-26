import Error from '@components/common/form/fields/Error';
import React from 'react';
import './Toggle.scss';

interface ClickProps {
  onClick: () => void;
}

interface ToggleProps {
  name: string;
  value: string | number | boolean;
  label?: string;
  onChange?: (value: boolean | number) => void;
  error?: string;
  instruction?: string;
}

function Enabled({ onClick }: ClickProps) {
  return (
    <a
      href="#"
      className="toggle enabled"
      onClick={(e) => {
        e.preventDefault();
        onClick();
      }}
    >
      <span />
    </a>
  );
}

function Disabled({ onClick }: ClickProps) {
  return (
    <a
      href="#"
      className="toggle disabled"
      onClick={(e) => {
        e.preventDefault();
        onClick();
      }}
    >
      <span />
    </a>
  );
}

const isBool = (value: string | number | boolean): value is boolean =>
  typeof value === 'boolean';

const isEnable = (value: boolean | number): boolean =>
  isBool(value) ? value : value === 1;

const getValue = (value: string | number | boolean): boolean | number =>
  isBool(value) ? value : parseInt(String(value), 10) || 0;

const getOppositeValue = (value: boolean | number): boolean | number => {
  if (isBool(value)) return !value;
  return value === 1 ? 0 : 1;
};

function Toggle({ name, value, label, onChange, error, instruction }: ToggleProps) {
  const [_value, setValue] = React.useState<boolean | number>(getValue(value));

  React.useEffect(() => {
    setValue(getValue(value));
  }, [value]);

  const onChangeFunc = () => {
    const newVal = getOppositeValue(_value);
    setValue(newVal);
    if (onChange) onChange(newVal);
  };

  return (
    <div className={`form-field-container ${error ? 'has-error' : null}`}>
      {label && <label htmlFor={name}>{label}</label>}
      <input type="hidden" value={+getValue(_value)} name={name} />
      <div className="field-wrapper flex flex-grow">
        {isEnable(_value) && <Enabled onClick={() => onChangeFunc()} />}
        {!isEnable(_value) && <Disabled onClick={() => onChangeFunc()} />}
      </div>
      {instruction && (
        <div className="field-instruction mt-sm">{instruction}</div>
      )}
      <Error error={error} />
    </div>
  );
}

export { Toggle };
