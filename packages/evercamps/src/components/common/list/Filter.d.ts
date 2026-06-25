interface FilterOption {
  label: string;
  value: string;
  onSelect: () => void;
}

interface FilterProps {
  title?: string;
  options?: FilterOption[];
  selectedOption?: string;
}

export default function Filter(props: FilterProps): JSX.Element;
