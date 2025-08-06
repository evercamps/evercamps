import { addProcessor } from '../../lib/util/registry.js';
import { defaultPaginationFilters } from '../../lib/util/defaultPaginationFilters.js';
import registerDefaultParticipantCollectionFilters from './services/registerDefaultParticipantCollectionFilters.js';

export default () => {
    addProcessor(
        'participantCollectionFilters',
        registerDefaultParticipantCollectionFilters,
        1
      );
      addProcessor(
        'participantCollectionFilters',
        (filters) => [...filters, ...defaultPaginationFilters],
        2
      );
}