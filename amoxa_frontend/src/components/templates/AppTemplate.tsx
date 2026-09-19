import { useCallback, useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { List, SignOut, X } from '@phosphor-icons/react';
import { Button } from '@atoms-button/Button.js';
import { SyncStatus } from '@atoms-display/SyncStatus.js';
import { ThemeToggle } from '@atoms/ThemeToggle.js';
import { useFocusTrap } from '@hooks/useFocusTrap.js';
import { useScreenHost } from '@hooks-screen/useScreenHost.js';
import { ScreenView } from '@sdui-react-screen/ScreenView';
import { useSyncAutoFlush } from '@hooks-sync/useSyncAutoFlush.js';
import { useSyncSnapshot } from '@hooks-sync/useSyncSnapshot.js';
import { ScreenRoute } from '@sdui-runtime-screen/screen-route';

export interface AppTemplateProps {
  userEmail?: string;
  onLogout: () => void;
  children: ReactNode;
}

const MAIN_ID = 'contenido';
const DRAWER_ID = 'menu-lateral';
const MENU_BUTTON_ID = 'boton-menu';
const SIDEBAR_SCREEN = 'shell.navegacion';

export function AppTemplate({ userEmail, onLogout, children }: AppTemplateProps) {
  const location = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);
  const wasOpen = useRef(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const sync = useSyncSnapshot();
  const host = useScreenHost();
  useSyncAutoFlush();

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  useFocusTrap(drawerRef, drawerOpen, closeDrawer);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setDrawerOpen(false);
    mainRef.current?.focus();
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (wasOpen.current && !drawerOpen) document.getElementById(MENU_BUTTON_ID)?.focus();
    wasOpen.current = drawerOpen;
  }, [drawerOpen]);

  const skipToContent = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    mainRef.current?.focus();
    mainRef.current?.scrollIntoView?.({ block: 'start' });
  };

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <a
        href={`#${MAIN_ID}`}
        onClick={skipToContent}
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-card focus:px-4 focus:py-3 focus:text-sm focus:font-semibold focus:text-foreground focus:shadow-md focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        Saltar al contenido
      </a>
      <header className="flex h-16 shrink-0 items-center gap-3 border-b border-border bg-card px-4 md:px-6">
        <Button
          id={MENU_BUTTON_ID}
          variant="outline"
          className="lg:hidden"
          aria-expanded={drawerOpen}
          aria-controls={DRAWER_ID}
          onClick={() => setDrawerOpen(true)}
          icon={List}
        >
          Menú
        </Button>
        <Link
          to={ScreenRoute.HOME_PATH}
          className="-ml-2 mr-auto rounded-lg px-2 py-2.5 text-lg font-bold tracking-tight text-foreground transition-colors duration-200 hover:bg-muted"
        >
          Amoxa
        </Link>
        <div className="hidden min-w-0 md:block">
          <SyncStatus state={sync.state} pending={sync.pending} lastSyncAt={sync.lastSyncAt} />
        </div>
        {userEmail ? (
          <span title={userEmail} className="hidden max-w-[16rem] truncate text-sm text-muted-foreground xl:inline">
            {userEmail}
          </span>
        ) : null}
        <ThemeToggle />
        <Button variant="outline" onClick={onLogout} aria-label="Cerrar sesión">
          <SignOut size={18} aria-hidden="true" />
          <span className="hidden sm:inline">Cerrar sesión</span>
        </Button>
      </header>
      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-64 shrink-0 border-r border-border bg-muted/40 lg:block">
          <div className="sticky top-0 max-h-dvh overflow-y-auto p-3">
            <nav aria-label="Principal">
              <ScreenView screenId={SIDEBAR_SCREEN} embedded host={host} />
            </nav>
          </div>
        </aside>
        <main id={MAIN_ID} ref={mainRef} tabIndex={-1} className="min-w-0 flex-1 outline-none">
          <div className="mx-auto w-full max-w-[1200px] px-4 py-6 md:px-8 md:py-10">
            <div className="mb-6 md:hidden">
              <SyncStatus state={sync.state} pending={sync.pending} lastSyncAt={sync.lastSyncAt} />
            </div>
            {children}
          </div>
        </main>
      </div>
      {drawerOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Cerrar menú"
            onClick={closeDrawer}
            className="absolute inset-0 cursor-pointer bg-black/50 backdrop-blur-sm"
          />
          <div
            id={DRAWER_ID}
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Menú de navegación"
            className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col gap-2 overflow-y-auto border-r border-border bg-card p-3 shadow-xl"
          >
            <div className="flex justify-end">
              <Button variant="ghost" aria-label="Cerrar menú" onClick={closeDrawer} icon={X} />
            </div>
            <nav aria-label="Principal">
              <ScreenView screenId={SIDEBAR_SCREEN} embedded host={host} />
            </nav>
          </div>
        </div>
      ) : null}
    </div>
  );
}
