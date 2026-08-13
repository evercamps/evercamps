import React from 'react';

interface TypeRowProps {
  id: string;
  areaProps: {
    row: {
      [key: string]: string | undefined;
    };
  };
}

export default function TypeRow({
  id,
  areaProps: { row }
}: TypeRowProps) {
  return (
    <td>
      <div>
        <span style={{ textTransform: 'capitalize' }}>
          {row[id]}
        </span>
      </div>
    </td>
  );
}