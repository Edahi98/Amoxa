import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@hooks/useAuth.js';
import { ScreenRoute } from '@sdui-runtime-screen/screen-route';
import type { RuntimeHost } from '@sdui-runtime/runtime-types';

export type ScreenHost = Omit<RuntimeHost, 'reload'>;

export function useScreenHost(): ScreenHost {
  const navigate = useNavigate();
  const { token, logout } = useAuth();

  return useMemo<ScreenHost>(
    () => ({
      navigate: (screenId, params) => navigate(ScreenRoute.pathFor(screenId, params)),
      logout,
      getToken: () => token,
    }),
    [navigate, logout, token],
  );
}
