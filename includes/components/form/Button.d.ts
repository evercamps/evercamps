import React from 'react';

interface ButtonProps {
  title: string | React.ReactNode;
  outline?: boolean;
  variant?: 'primary' | 'secondary' | 'critical' | 'interactive';
  onAction?: () => void;
  url?: string;
  isLoading?: boolean;
  type?: 'button' | 'submit' | 'reset';
}

declare function Button(props: ButtonProps): React.ReactElement;

export default Button;
