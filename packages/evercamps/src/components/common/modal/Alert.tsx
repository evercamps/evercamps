import Button from '@components/common/form/Button';
import produce from 'immer';
import React, { useReducer } from 'react';
import ReactDOM from 'react-dom';
import { assign } from '../../../lib/util/assign.js';
import './Alert.scss';
import { Card } from '@components/admin/cms/Card';

interface AlertAction {
  title: string | React.ReactNode;
  onAction?: () => void;
  [key: string]: unknown;
}

interface AlertPayload {
  heading?: string;
  content?: React.ReactNode;
  primaryAction?: AlertAction;
  secondaryAction?: AlertAction;
}

interface AlertActionUpdate {
  title?: string | React.ReactNode;
  onAction?: () => void;
  [key: string]: unknown;
}

interface AlertPayloadUpdate {
  heading?: string;
  content?: React.ReactNode;
  primaryAction?: AlertActionUpdate;
  secondaryAction?: AlertActionUpdate;
}

interface AlertContextValue {
  dispatchAlert: React.Dispatch<{ type: string; payload?: AlertPayloadUpdate }>;
  openAlert: (payload: AlertPayload) => void;
  closeAlert: () => void;
}

interface ModalState {
  showing: boolean;
  closing: boolean;
}

type ModalAction = { type: 'close' | 'closing' | 'open' };

const AlertContext = React.createContext<AlertContextValue | undefined>(undefined);
export const useAlertContext = (): AlertContextValue => {
  const ctx = React.useContext(AlertContext);
  if (!ctx) throw new Error('useAlertContext must be used within <Alert>');
  return ctx;
};

function reducer(state: ModalState, action: ModalAction): ModalState {
  switch (action.type) {
    case 'close':
      return { ...state, showing: false, closing: false };
    case 'closing':
      return { ...state, showing: true, closing: true };
    case 'open':
      return { ...state, showing: true, closing: false };
    default:
      throw new Error();
  }
}

const alertReducer = produce((draff: AlertPayload, action: { type: string; payload?: AlertPayload }) => {
  switch (action.type) {
    case 'open':
      draff = { ...action.payload };
      return draff;
    case 'remove':
      return {} as AlertPayload;
    case 'update':
      if (action.payload) assign(draff, action.payload);
      return draff;
    default:
      throw new Error();
  }
});

interface AlertProps {
  children: React.ReactNode;
}

function Alert({ children }: AlertProps) {
  const [alert, dispatchAlert] = useReducer(alertReducer, {});
  const [state, dispatch] = useReducer(reducer, {
    showing: false,
    closing: false
  });

  const openAlert = ({ heading, content, primaryAction, secondaryAction }: AlertPayload) => {
    dispatchAlert({
      type: 'open',
      payload: { heading, content, primaryAction, secondaryAction }
    });
    dispatch({ type: 'open' });
  };

  return (
    <AlertContext value={{
      dispatchAlert,
      openAlert,
      closeAlert: () => dispatch({ type: 'closing' })
    }}>
      {children}
      {state.showing === true &&
        ReactDOM.createPortal(
          <div
            className={
              state.closing === false
                ? 'modal-overlay fadeIn'
                : 'modal-overlay fadeOut'
            }
            onAnimationEnd={() => {
              if (state.closing) {
                dispatch({ type: 'close' });
                dispatchAlert({ type: 'remove' });
              }
            }}
          >
            <div
              className="modal-wrapper flex self-center justify-center"
              aria-modal
              aria-hidden
              tabIndex={-1}
              role="dialog"
            >
              <div className="modal">
                <button
                  type="button"
                  className="modal-close-button text-icon"
                  onClick={() => dispatch({ type: 'closing' })}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="2rem"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
                <Card title={alert.heading}>
                  <Card.Session>{alert.content}</Card.Session>
                  {(alert.primaryAction !== undefined ||
                    alert.secondaryAction !== undefined) && (
                    <Card.Session>
                      <div className="flex justify-end space-x-4">
                        {alert.primaryAction && (
                          <Button {...alert.primaryAction} />
                        )}
                        {alert.secondaryAction && (
                          <Button {...alert.secondaryAction} />
                        )}
                      </div>
                    </Card.Session>
                  )}
                </Card>
              </div>
            </div>
          </div>,
          document.body
        )}
    </AlertContext>
  );
}

export { Alert };
