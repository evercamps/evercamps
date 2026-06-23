import { Checkbox } from '@components/common/form/fields/Checkbox';
import { Date } from '@components/common/form/fields/Date';
import { DateTime } from '@components/common/form/fields/DateTime';
import { Hidden } from '@components/common/form/fields/Hidden';
import { Input } from '@components/common/form/fields/Input';
import { MultiSelect } from '@components/common/form/fields/MultiSelect';
import { Password } from '@components/common/form/fields/Password';
import { Radio } from '@components/common/form/fields/Radio';
import { Select } from '@components/common/form/fields/Select';
import { TextArea } from '@components/common/form/fields/Textarea';
import { Toggle } from '@components/common/form/fields/Toggle';
import { useFormContext } from '@components/common/form/Form';
import PubSub from 'pubsub-js';
import React from 'react';
import isEqual from 'react-fast-compare';
import './Field.scss';
import { FORM_FIELD_UPDATED } from '../../../lib/util/events';

type FieldType =
  | 'text'
  | 'select'
  | 'multiselect'
  | 'checkbox'
  | 'radio'
  | 'toggle'
  | 'date'
  | 'datetime'
  | 'textarea'
  | 'password'
  | 'hidden';

type ValidationRule = string | { rule: string; message?: string };

type SelectOption = { value: string | number; text: string };

export interface FieldProps {
  name: string;
  type: FieldType;
  label?: string;
  instruction?: string;
  value?: string | number | boolean;
  onChange?: (newValue: unknown, fieldProps?: FieldProps) => void;
  validationRules?: ValidationRule[];
  // shared display props
  placeholder?: string;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  // select / multiselect / radio
  options?: SelectOption[];
  disableDefaultOption?: boolean;
  // checkbox
  isChecked?: boolean;
  // html input attributes forwarded by Input
  id?: string;
  disabled?: boolean;
  readonly?: boolean;
  maxlength?: number;
  minlength?: number;
  pattern?: string;
  autocomplete?: string;
  autofocus?: boolean;
  dirname?: string;
  form?: string;
  defaultValue?: string | number;
  enterkeyhint?: string;
  onFocus?: React.FocusEventHandler<HTMLInputElement>;
  onBlur?: React.FocusEventHandler<HTMLInputElement>;
  onKeyPress?: React.KeyboardEventHandler<HTMLInputElement>;
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>;
  onKeyUp?: React.KeyboardEventHandler<HTMLInputElement>;
}

const useMemoizeArgs = <T extends unknown[]>(
  args: T,
  equalityFunc: (a: unknown, b: unknown) => boolean
): T => {
  const ref = React.useRef<T>();
  const prevArgs = ref.current;
  const argsAreEqual =
    prevArgs !== undefined &&
    args.length === prevArgs.length &&
    args.every((v, i) => equalityFunc(v, prevArgs[i]));

  React.useEffect(() => {
    if (!argsAreEqual) {
      ref.current = args;
    }
  });

  return argsAreEqual ? prevArgs : args;
};

export function Field(props: FieldProps) {
  const { name, validationRules, onChange, type } = props;
  let {value} = props;
  if(value === undefined) {
    value = '';
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const context = useFormContext() as any;
  const [fieldValue, setFieldValue] = React.useState(value ?? '');
  const field = context.fields.find(
    (f: { name: string }) => f.name && f.name === name
  );

  React.useEffect(() => {
    context.addField(name, value, validationRules ?? []);

    return () => {
      context.removeField(name);
    };
  }, [name]);

  React.useEffect(() => {
    setFieldValue(value);
    if (!field) {
      return;
    }
    context.updateField(name, value, validationRules);
  }, useMemoizeArgs([value], isEqual));

  React.useEffect(() => {
    if (field) {
      setFieldValue(field.value);
    }
  }, [field]);

  React.useEffect(() => {
    PubSub.publishSync(FORM_FIELD_UPDATED, { name, value: fieldValue });
  }, [fieldValue]);

  const onChangeFunc = (newValue: unknown) => {
    let fieldVal: unknown;
    if (
      typeof newValue === 'object' &&
      newValue !== null &&
      'target' in newValue
    ) {
      fieldVal = (newValue as React.ChangeEvent<HTMLInputElement>).target.value;
    } else {
      fieldVal = newValue;
    }
    setFieldValue(fieldVal as string | number | boolean);
    context.updateField(name, fieldVal, validationRules);

    if (onChange) {
      onChange.call(window, newValue, props);
    }
  };

  const F = (() => {
    switch (type) {
      case 'text':
        return Input;
      case 'select':
        return Select;
      case 'multiselect':
        return MultiSelect;
      case 'checkbox':
        return Checkbox;
      case 'radio':
        return Radio;
      case 'toggle':
        return Toggle;
      case 'date':
        return Date;
      case 'datetime':
        return DateTime;
      case 'textarea':
        return TextArea;
      case 'password':
        return Password;
      case 'hidden':
        return Hidden;
      default:
        return Input;
    }
  })();

  return (
    <F
      {...(props as any)}
      onChange={onChangeFunc}
      value={fieldValue}
      error={field ? field.error : undefined}
    />
  );
}
