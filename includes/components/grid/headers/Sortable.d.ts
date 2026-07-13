import { GraphQLFilter } from '../../../../types/graphqlFilter';

interface SortableHeaderProps {
  title: string;
  name: string;
  currentFilters?: GraphQLFilter[];
}

export default function SortableHeader(props: SortableHeaderProps): JSX.Element;
