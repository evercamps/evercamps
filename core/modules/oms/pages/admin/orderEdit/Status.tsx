import Badge from '@components/Badge';
import React from 'react';

interface StatusInfo {
  badge?: string;
  name?: string;
  progress?: string;
}

interface Order {
  status?: StatusInfo;
}

interface StatusProps {
  order: Order;
}

export default function Status({ order: { status } }: StatusProps) {
  if (status) {
    return (
      <Badge
        variant={status.badge}
        title={status.name}
        progress={status.progress}
      />
    );
  }

  return null;
}

export const layout = {
  areaId: 'pageHeadingLeft',
  sortOrder: 200
};

export const query = `
  query Query {
    order(uuid: getContextValue("orderId")) {
      status {
        code
        badge
        progress
        name
      }
    }
  }
`;