import React from 'react';

export interface CardAction {
  onAction?: () => void;
  variant?: string;
  name?: string;
}

interface SessionProps {
  actions?: CardAction[];
  title?: string | React.ReactNode;
  children?: React.ReactNode;
}

interface CardProps {
  title?: string | React.ReactNode;
  actions?: CardAction[];
  subdued?: boolean;
  children: React.ReactNode;
}

interface CardComponent extends React.FC<CardProps> {
  Session: React.FC<SessionProps>;
}

export declare const Card: CardComponent;
