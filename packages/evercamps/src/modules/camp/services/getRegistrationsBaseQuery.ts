import { select, SelectQuery } from '@evershop/postgres-query-builder';

export const getRegistrationsBaseQuery = (): SelectQuery => {
  const query = select(    
    'registration.registration_id',
    'registration.uuid',
    'registration.registration_participant_id',
    'registration.registration_product_id',
    'registration.created_at',    
    'product.product_id',
    'product.sku',
    'product_description.name',
    'product_image.thumb_image',
    'participant.first_name',
    'participant.last_name'
  ).from('registration');
  query
  .leftJoin('product')
  .on('registration.registration_product_id', '=', 'product.product_id');

  query
    .leftJoin('product_description')
    .on(
      'product_description.product_description_product_id',
      '=',
      'product.product_id'
    );  

  query
    .leftJoin('product_image')
    .on('product_image.product_image_product_id', '=', 'product.product_id')
    .and('product_image.is_main', '=', true);

    query
  .leftJoin('participant')
  .on('registration.registration_participant_id', '=', 'participant.participant_id');
  
  return query;
};
