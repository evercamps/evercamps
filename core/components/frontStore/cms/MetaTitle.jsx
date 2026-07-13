import { useAppState } from '@components/context/app';
import Title from '@components/Title';
import React from 'react';
import { get } from '../../../lib/util/get.js';


export default function MetaTitle() {
  const title = get(useAppState(), 'metaTitle');

  return <Title title={title} />;
}
