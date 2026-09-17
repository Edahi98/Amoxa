import { createContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AuthApi } from '@utils-auth/authApi.js';
import { JwtPayloadDecoder } from '@utils/decodeJwtPayload.js';
import { TokenStorage } from '@utils-storage/tokenStorage.js';
import type { AuthUser } from '@utils-auth/authUser.js';

export type { AuthUser };

export interface AuthContextValue {
  token: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [token, setToken] = useState<string | null>(() => TokenStorage.getStored());
  const [user, setUser] = useState<AuthUser | null>(() => {
    const stored = TokenStorage.getStored();
    return stored ? JwtPayloadDecoder.decode<AuthUser>(stored) : null;
  });

  const isExpired = TokenStorage.isExpired(user);

  useEffect(() => {
    if (isExpired) {
      setToken(null);
      setUser(null);
      TokenStorage.clear();
    }
  }, [isExpired]);

  const login = async (email: string, password: string) => {
    const { accessToken } = await AuthApi.login(email, password);
    const payload = JwtPayloadDecoder.decode<AuthUser>(accessToken);

    setToken(accessToken);
    setUser(payload);
    TokenStorage.setStored(accessToken);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    TokenStorage.clear();
  };

  const value = useMemo<AuthContextValue>(
    () => ({ token, user, isAuthenticated: token !== null && !isExpired, login, logout }),
    [token, user, isExpired],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
