import { useParams, useSearchParams } from 'react-router-dom';
import { AppTemplate } from '@templates/AppTemplate.js';
import { useAuth } from '@hooks/useAuth.js';
import { useScreenHost } from '@hooks-screen/useScreenHost.js';
import { ScreenView } from '@sdui-react-screen/ScreenView';
import { ScreenRoute } from '@sdui-runtime-screen/screen-route';

export function Screen() {
  const { screenId } = useParams();
  const [search] = useSearchParams();
  const { user, logout } = useAuth();
  const host = useScreenHost();
  const target = ScreenRoute.fromLocation(screenId, search);

  return (
    <AppTemplate userEmail={user?.email} onLogout={logout}>
      <ScreenView screenId={target.screenId} entityId={target.entityId} entityType={target.entityType} host={host} />
    </AppTemplate>
  );
}
