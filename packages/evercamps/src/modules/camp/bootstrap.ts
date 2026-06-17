import { addProcessor } from '../../lib/util/registry.js';
import { defaultPaginationFilters } from '../../lib/util/defaultPaginationFilters.js';
import registerDefaultParticipantCollectionFilters from './services/registerDefaultParticipantCollectionFilters.js';
import registerDefaultRegistrationCollectionFilters from './services/registerDefaultRegistrationCollectionFilters.js';

export default (): void => {
  addProcessor(
    'participantCollectionFilters',
    registerDefaultParticipantCollectionFilters,
    1
  );

  addProcessor(
    'participantCollectionFilters',
    (filters: any[]) => [...filters, ...defaultPaginationFilters],
    2
  );

  addProcessor(
    'registrationCollectionFilters',
    registerDefaultRegistrationCollectionFilters,
    1
  );

  addProcessor(
    'registrationCollectionFilters',
    (filters: any[]) => [...filters, ...defaultPaginationFilters],
    2
  );
};