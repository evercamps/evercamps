import React from 'react';

interface Row {
  [key: string]: string | undefined;
  id?: string;
  editUrl?: string;
}

interface AreaProps {
  row: Row;
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
        <a className="hover:underline font-semibold" href={row[editUrl]}>
          {row[id]}
        </a>
      </div>
    </td>
  );
}