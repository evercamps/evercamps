import React from 'react';
import isDebugAreasEnabled from '../../lib/util/isDebugAreasEnabled.js';
import isDevelopmentMode from '../../lib/util/isDevelopmentMode.js';
import './AreaDebugFrame.scss';

interface AreaDebugFrameProps {
  id: string;
  count: number;
  children: React.ReactNode;
}

const DEBUG_COLORS = [
  '#ef4444',
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#a855f7',
  '#ec4899'
];

const AreaDebugDepthContext = React.createContext(0);

function AreaDebugFrameInner({ id, count, children }: AreaDebugFrameProps) {
  const depth = React.useContext(AreaDebugDepthContext);
  // Query param is only known client-side, so start disabled and flip after
  // mount to keep the first client render matching the server-rendered HTML.
  const [enabled, setEnabled] = React.useState(false);

  React.useEffect(() => {
    setEnabled(isDebugAreasEnabled());
  }, []);

  if (!enabled) {
    return <>{children}</>;
  }

  const isEmpty = count === 0;
  const color = DEBUG_COLORS[depth % DEBUG_COLORS.length];

  return (
    <AreaDebugDepthContext.Provider value={depth + 1}>
      <div
        className={`area-debug-frame${isEmpty ? ' area-debug-frame--empty' : ''}`}
        style={{ '--area-debug-color': color } as React.CSSProperties}
      >
        <span className="area-debug-frame__label">
          {id}
          {isEmpty ? ' · empty' : ` · ${count}`}
        </span>
        {children}
      </div>
    </AreaDebugDepthContext.Provider>
  );
}

export function AreaDebugFrame(props: AreaDebugFrameProps) {
  // Dead in production: isDevelopmentMode() is inlined to `false` by the
  // build, so bundlers can strip this whole branch (and AreaDebugFrameInner
  // with it).
  if (!isDevelopmentMode()) {
    return <>{props.children}</>;
  }
  return <AreaDebugFrameInner {...props} />;
}

export default AreaDebugFrame;
