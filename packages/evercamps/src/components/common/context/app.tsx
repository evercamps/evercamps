import produce from 'immer';
import React, { useMemo } from 'react';

interface AppDispatch {
  setData: React.Dispatch<React.SetStateAction<Record<string, unknown>>>;
  fetchPageData: (url: URL) => Promise<void>;
}

const AppStateContext = React.createContext<(Record<string, unknown> & { fetching: boolean }) | undefined>(undefined);
const AppContextDispatch = React.createContext<AppDispatch | undefined>(undefined);

interface AppProviderProps {
  value: Record<string, unknown>;
  children: React.ReactNode;
}

export function AppProvider({ value, children }: AppProviderProps) {
  const [data, setData] = React.useState<Record<string, unknown>>(value);
  const [fetching, setFetching] = React.useState(false);

  const fetchPageData = async (url: URL) => {
    setFetching(true);
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    const dataResponse = await response.json();
    setData(
      produce(data, (draff) => {
        draff = dataResponse.eContext;
        return draff;
      })
    );
    setFetching(false);
  };

  React.useEffect(() => {
    window.onpopstate = async () => {
      const url = new URL(window.location.href, window.location.origin);
      url.searchParams.append('ajax', 'true');
      await fetchPageData(url);
    };
  }, []);

  const contextDispatchValue = useMemo<AppDispatch>(() => ({ setData, fetchPageData }), []);
  const contextValue = useMemo(() => ({ ...data, fetching }), [data, fetching]);

  return (
    <AppContextDispatch value={contextDispatchValue}>
      <AppStateContext value={contextValue}>
        {children}
      </AppStateContext>
    </AppContextDispatch>
  );
}

export const useAppState = () => React.useContext(AppStateContext);
export const useAppDispatch = () => React.useContext(AppContextDispatch);
