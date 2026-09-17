import { createBrowserRouter } from 'react-router-dom';
import { Home } from '@pages/Home.js';
import { Login } from '@pages/Login.js';
import { Dashboard } from '@pages/Dashboard.js';
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
    path: '/dashboard',
    element: (
      <ProtectedRoute>
        <Dashboard />
      </ProtectedRoute>
    ),
  },
]);
