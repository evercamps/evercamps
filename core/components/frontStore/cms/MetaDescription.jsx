import { useAppState } from '@components/context/app';
import Meta from '@components/Meta';
import React from 'react';
import { get } from '../../../lib/util/get.js';

export default function MetaDescription() {
  const description = get(useAppState(), 'metaDescription', '');

  return <Meta name="description" content={description} />;
}
