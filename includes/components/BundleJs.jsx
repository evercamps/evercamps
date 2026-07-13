import { useAppState } from '@components/context/app';
import Script from '@components/Script';
import React from 'react';
import { get } from '../../lib/util/get.js';

export default function BundleJS() {
  const src = get(useAppState(), 'bundleJs');
  return <Script src={src} isAsync={false} />;
}
