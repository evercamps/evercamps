import React, { useMemo, useState } from 'react';
import { useAppDispatch } from './app';

export interface Step {
  id: string;
  title: string;
  isCompleted?: boolean;
  isEditing?: boolean;
  sortOrder?: number;
  editable?: boolean;
  preview?: React.ReactNode;
}

interface CheckoutStepsDispatchValue {
  canStepDisplay: (step: Step) => boolean;
  editStep: (stepId: string) => void;
  completeStep: (stepId: string, preview?: React.ReactNode) => Promise<void>;
  addStep: (step: Step) => void;
}

const Steps = React.createContext<Step[] | undefined>(undefined);
const CheckoutStepsDispatch = React.createContext<CheckoutStepsDispatchValue | undefined>(undefined);

interface CheckoutStepsProps {
  children: React.ReactNode;
  value: Step[];
}

export function CheckoutSteps({ children, value }: CheckoutStepsProps) {
  const AppContextDispatch = useAppDispatch();
  const [steps, setSteps] = useState<Step[]>(value);

  const canStepDisplay = (step: Step): boolean => {
    const checkoutSteps = [...steps].sort(
      (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
    );
    const index = checkoutSteps.findIndex((s) => s.id === step.id);

    if (!checkoutSteps.slice(0, index).every((s) => s.isCompleted === true))
      return false;
    if (index === steps.length - 1) return true;
    if (step.isCompleted !== true) return true;
    return false;
  };

  const addStep = (step: Step) => {
    setSteps((previous) => previous.concat([step]));
  };

  const editStep = (stepId: string) => {
    const index = steps.findIndex((s) => s.id === stepId);
    setSteps(
      steps.map((s, i) => {
        if (s.id === stepId) {
          return { ...s, isCompleted: false };
        } else if (i > index) {
          return { ...s, isCompleted: false };
        } else return s;
      })
    );
  };

  const completeStep = async (stepId: string, preview?: React.ReactNode) => {
    const url = new URL(window.location.href, window.location.origin);
    url.searchParams.append('ajax', 'true');
    await AppContextDispatch?.fetchPageData(url);
    url.searchParams.delete('ajax');
    setSteps(
      steps.map((s) => {
        if (s.id === stepId) {
          return { ...s, isCompleted: true, isEditing: false, preview };
        } else return s;
      })
    );
  };

  const contextDispatchValue = useMemo<CheckoutStepsDispatchValue>(
    () => ({ canStepDisplay, editStep, completeStep, addStep }),
    [steps]
  );

  return (
    <Steps value={steps}>
      <CheckoutStepsDispatch value={contextDispatchValue}>
        {children}
      </CheckoutStepsDispatch>
    </Steps>
  );
}

export const useCheckoutSteps = () => React.useContext(Steps);
export const useCheckoutStepsDispatch = () => React.useContext(CheckoutStepsDispatch);
