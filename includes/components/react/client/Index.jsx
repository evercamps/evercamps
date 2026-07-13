import Area from '@components/Area';
import { App } from '@components/react/client/Client';
import { HotReload } from '@components/react/client/HotReload';
import React from 'react';
import { createRoot } from 'react-dom/client';
import hot from 'webpack-hot-middleware/client?path=/eHot&reload=true&overlay=true';
/** render */
const root = createRoot(document.getElementById('app'));
root.render(
  <App>
    <Area />
    <HotReload hot={hot} />
  </App>
);
