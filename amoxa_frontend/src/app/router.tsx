import { createBrowserRouter } from 'react-router-dom';
import { Home } from '@pages/Home.js';
import { Dashboard } from '@pages/Dashboard.js';

export const router = createBrowserRouter([
  { path: '/', element: <Home /> },
  { path: '/dashboard', element: <Dashboard /> },
]);
