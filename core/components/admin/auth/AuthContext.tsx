import Area from '@components/common/Area';
import { useAppState } from '@components/common/context/app';
import React from 'react';
import { createClient, Provider } from 'urql';
import { get } from '../../../lib/util/get.js';

const AuthContext = React.createContext<string | undefined>(undefined);

export function AuthProvider() {
  const context = useAppState();
  const token = get(context, 'token') as string | undefined;

  const client = createClient({
    url: '/v1/graphql'
  });

  return (
    <AuthContext value={token}>
      <Provider value={client}>
        <Area id="body" />
      </Provider>
    </AuthContext>
  );
}

export const useToken = () => React.useContext(AuthContext);
