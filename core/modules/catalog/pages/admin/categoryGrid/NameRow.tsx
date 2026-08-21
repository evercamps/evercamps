import React from 'react';

interface RowData {
  [key: string]: string | undefined;
}

interface AreaProps {
  row: RowData;
}

interface NameRowProps {
  id: string;
  editUrl: string;
  areaProps: AreaProps;
}

export default function NameRow({
  id,
  editUrl,
  areaProps: { row }
}: NameRowProps) {
  return (
    <td>
      <div>
        <a
          className="hover:underline font-semibold"
          href={row[editUrl]}
        >
          {row[id]}
        </a>
      </div>
    </td>
  );
}