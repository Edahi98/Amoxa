import { AppTemplate } from '@templates/AppTemplate.js';
import { useAuth } from '@hooks/useAuth.js';
import { useScreenHost } from '@hooks-screen/useScreenHost.js';
import { ScreenView } from '@sdui-react-screen/ScreenView';
import { ScreenRoute } from '@sdui-runtime-screen/screen-route';

export function Dashboard() {
  const { user, logout } = useAuth();
  const host = useScreenHost();

  return (
    <AppTemplate userEmail={user?.email} onLogout={logout}>
      <ScreenView screenId={ScreenRoute.HOME_SCREEN} host={host} />
    </AppTemplate>
  );
}
