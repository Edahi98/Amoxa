import { createBrowserRouter } from 'react-router-dom';
import { Home } from '@pages/Home.js';
import { Login } from '@pages/Login.js';
import { Setup } from '@pages/Setup.js';
import { Dashboard } from '@pages/Dashboard.js';
import { Screen } from '@pages/Screen.js';
import { ProtectedRoute } from '@app-guards/ProtectedRoute.js';
import { GuestRoute } from '@app-guards/GuestRoute.js';

export const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <GuestRoute>
        <Home />
      </GuestRoute>
    ),
  },
  {
    path: '/login',
    element: (
      <GuestRoute>
        <Login />
      </GuestRoute>
    ),
  },
  {
    path: '/setup',
    element: (
      <GuestRoute>
        <Setup />
      </GuestRoute>
    ),
  },
  {
    path: '/dashboard',
    element: (
      <ProtectedRoute>
        <Dashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: '/app/:screenId',
    element: (
      <ProtectedRoute>
        <Screen />
      </ProtectedRoute>
    ),
  },
]);
