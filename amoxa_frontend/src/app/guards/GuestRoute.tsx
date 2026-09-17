import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@hooks/useAuth.js';

export interface GuestRouteProps {
  children: ReactNode;
}

export function GuestRoute({ children }: GuestRouteProps) {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
