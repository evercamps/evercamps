import Button from '@components/common/form/Button';
import PubSub from 'pubsub-js';
import React, { useState } from 'react';
import { FORM_SUBMIT, FORM_VALIDATED } from '../../../lib/util/events';
import { serializeForm } from '../../../lib/util/formToJson';
import { get } from '../../../lib/util/get.js';
import { validator } from './validator';
import type { ValidationRule } from '../../../types/form';

interface FormField {
  name: string;
  value: unknown;
  validationRules: ValidationRule[];
  updated: boolean;
  error?: string;
}

interface FormContextValue {
  fields: FormField[];
  addField: (name: string, value: unknown, validationRules?: ValidationRule[]) => void;
  updateField: (name: string, value: unknown, validationRules?: ValidationRule[]) => void;
  removeField: (name: string) => void;
  state: string;
  [key: string]: unknown;
}

interface FormDispatchValue {
  submit: (e: React.FormEvent<HTMLFormElement>) => Promise<boolean>;
  validate: () => Record<string, string>;
}

export const FormContext = React.createContext<FormContextValue | undefined>(undefined);
export const FormDispatch = React.createContext<FormDispatchValue | undefined>(undefined);

interface FormProps {
  id: string;
  action?: string;
  method?: string;
  isJSON?: boolean;
  onStart?: () => Promise<void> | void;
  onComplete?: () => Promise<void> | void;
  onError?: (error: unknown) => Promise<void> | void;
  onSuccess?: (responseJson: unknown) => Promise<void> | void;
  onValidationError?: () => Promise<void> | void;
  children: React.ReactNode;
  submitBtn?: boolean;
  btnText?: string;
  dataFilter?: (data: unknown) => unknown;
}

export function Form(props: FormProps) {
  const {
    id,
    action = '',
    method = 'POST',
    isJSON = true,
    onStart,
    onComplete,
    onError,
    onSuccess,
    onValidationError,
    children,
    submitBtn = true,
    btnText,
    dataFilter
  } = props;

  const [fields, setFields] = React.useState<FormField[]>([]);
  const formRef = React.useRef<HTMLFormElement>(null);
  const [loading, setLoading] = useState(false);
  const [state, setState] = useState('initialized');

  const addField = (name: string, value: unknown, validationRules: ValidationRule[] = []) => {
    setFields((previous) =>
      previous.concat({ name, value, validationRules, updated: false })
    );
  };

  const updateField = (name: string, value: unknown, validationRules: ValidationRule[] = []) => {
    setFields((previous) =>
      previous.map((f) => {
        if (f.name === name) {
          return { name, value, validationRules, updated: true };
        } else {
          return f;
        }
      })
    );
  };

  const removeField = (name: string) => {
    setFields((previous) => previous.filter((f) => f.name !== name));
  };

  const validate = (): Record<string, string> => {
    const errors: Record<string, string> = {};
    fields.forEach((f) => {
      f.validationRules.forEach((r) => {
        let rule: string;
        if (typeof r === 'string') {
          rule = r;
        } else {
          rule = r.rule;
        }

        const ruleValidator = validator.getRule(rule);
        if (ruleValidator === undefined) return;
        if (!ruleValidator.handler.call(fields, f.value)) {
          if (typeof r !== 'string' && r.message) {
            errors[f.name] = r.message;
          } else {
            errors[f.name] = ruleValidator.errorMessage;
          }
        }
      });
    });

    if (Object.keys(errors).length === 0) {
      setFields(fields.map((f) => ({ ...f, error: undefined })));
    } else {
      setFields(
        fields.map((f) => {
          if (!errors[f.name]) {
            return { ...f, error: undefined };
          }
          return { ...f, error: errors[f.name] };
        })
      );
    }

    return errors;
  };

  const submit = async (e: React.FormEvent<HTMLFormElement>): Promise<boolean> => {
    e.preventDefault();
    setState('submitting');
    try {
      PubSub.publishSync(FORM_SUBMIT, { props });
      const errors = validate();
      PubSub.publishSync(FORM_VALIDATED, { formId: id, errors });
      if (Object.keys(errors).length === 0) {
        const formData = new FormData(document.getElementById(id) as HTMLFormElement);
        setLoading(true);
        if (onStart) {
          await onStart();
        }
        const response = await fetch(action, {
          method,
          body:
            isJSON === true
              ? JSON.stringify(serializeForm(formData.entries(), dataFilter))
              : formData,
          headers: {
            'X-Requested-With': 'XMLHttpRequest',
            ...(isJSON === true ? { 'Content-Type': 'application/json' } : {})
          }
        });

        if (
          !response.headers.get('content-type') ||
          !response.headers.get('content-type')!.includes('application/json')
        ) {
          throw new TypeError('Something wrong. Please try again');
        }

        const responseJson = await response.json();
        if (get(responseJson, 'data.redirectUrl') !== undefined) {
          window.location.href = responseJson.data.redirectUrl;
          return true;
        }

        if (onSuccess) {
          await onSuccess(responseJson);
        }
        setState('submitSuccess');
      } else {
        setState('validateFailed');
        if (onValidationError) {
          await onValidationError();
        }
        const firstFieldWithError = Object.keys(errors)[0];
        const firstElementWithError = document.getElementsByName(firstFieldWithError)[0];
        if (firstElementWithError) {
          firstElementWithError.focus();
        }
      }
    } catch (error) {
      setState('submitFailed');
      if (onError) {
        await onError(error);
      }
      throw error;
    } finally {
      setLoading(false);
      setState('submitted');
      if (onComplete) {
        await onComplete();
      }
    }
    return true;
  };

  return (
    <FormContext value={{
      fields,
      addField,
      updateField,
      removeField,
      state,
      ...props
    }}>
      <FormDispatch value={{ submit, validate }}>
        <form
          ref={formRef}
          id={id}
          action={action}
          method={method}
          onSubmit={(e) => submit(e)}
        >
          {children}
          {submitBtn === true && (
            <div className="form-submit-button flex border-t border-divider mt-4 pt-4">
              <Button
                title={btnText || 'Save'}
                onAction={() => {
                  document
                    .getElementById(id)
                    ?.dispatchEvent(
                      new Event('submit', { cancelable: true, bubbles: true })
                    );
                }}
                isLoading={loading}
                type="submit"
              />
            </div>
          )}
        </form>
      </FormDispatch>
    </FormContext>
  );
}

export const useFormContext = () => React.useContext(FormContext);
export const useFormDispatch = () => React.useContext(FormDispatch);
