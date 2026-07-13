import { addProcessor } from '../../lib/util/registry.js';
import { defaultPaginationFilters } from '../../lib/util/defaultPaginationFilters.js';
import { CollectionFilter } from '../../types/index.js';
import registerDefaultParticipantCollectionFilters from './services/registerDefaultParticipantCollectionFilters.js';
import registerDefaultRegistrationCollectionFilters from './services/registerDefaultRegistrationCollectionFilters.js';

const paginationFilters = defaultPaginationFilters as CollectionFilter[];

export default () => {
    addProcessor<CollectionFilter[]>(
        'participantCollectionFilters',
        registerDefaultParticipantCollectionFilters,
        1
      );
      addProcessor<CollectionFilter[]>(
        'participantCollectionFilters',
        (filters) => [...filters, ...paginationFilters],
        2
      );
      addProcessor<CollectionFilter[]>(
        'registrationCollectionFilters',
        registerDefaultRegistrationCollectionFilters,
        1
      );
      addProcessor<CollectionFilter[]>(
        'registrationCollectionFilters',
        (filters) => [...filters, ...paginationFilters],
        2
      );
}
