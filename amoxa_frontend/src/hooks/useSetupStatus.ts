import { useEffect, useState } from 'react';
import { SetupApi } from '@utils-auth-setup/setupApi.js';

export type SetupStatus = 'loading' | 'pending' | 'initialized' | 'error';

export function useSetupStatus(): SetupStatus {
  const [status, setStatus] = useState<SetupStatus>('loading');

  useEffect(() => {
    let active = true;
    SetupApi.isInitialized()
      .then((initialized) => active && setStatus(initialized ? 'initialized' : 'pending'))
      .catch(() => active && setStatus('error'));
    return () => {
      active = false;
    };
  }, []);

  return status;
}
