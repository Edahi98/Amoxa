import { useState } from 'react';
import { List, X } from '@phosphor-icons/react';
import { Container } from '@atoms-layout/Container.js';
import { LinkButton } from '@atoms-button/LinkButton.js';
import { ThemeToggle } from '@atoms/ThemeToggle.js';

const NAV_LINKS = [
  { href: '#ciclo', label: 'El ciclo' },
  { href: '#restricciones', label: 'Lo que no deja hacer' },
  { href: '#marco', label: 'Marco normativo' },
];

export function SiteHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-white/50 bg-white/70 backdrop-blur-md dark:border-white/10 dark:bg-slate-900/70">
      <Container className="flex h-16 items-center justify-between gap-4">
        <a href="#top" className="text-lg font-bold tracking-tight text-foreground">
          Amoxa
        </a>
        <nav className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-muted-foreground transition-colors duration-200 hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <LinkButton to="/login" variant="ghost" className="hidden md:inline-flex">
            Iniciar sesión
          </LinkButton>
          <button
            type="button"
            onClick={() => setIsMenuOpen((open) => !open)}
            aria-label={isMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={isMenuOpen}
            aria-controls="site-nav-mobile"
            className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg border border-border bg-card text-foreground transition-colors duration-200 hover:bg-muted focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2 md:hidden"
          >
            {isMenuOpen ? <X size={20} weight="regular" aria-hidden="true" /> : <List size={20} weight="regular" aria-hidden="true" />}
          </button>
        </div>
      </Container>
      {isMenuOpen ? (
        <nav
          id="site-nav-mobile"
          className="border-t border-white/50 bg-white/90 backdrop-blur-md dark:border-white/10 dark:bg-slate-900/90 md:hidden"
        >
          <Container className="flex flex-col gap-1 py-3">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setIsMenuOpen(false)}
                className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors duration-200 hover:bg-muted hover:text-foreground"
              >
                {link.label}
              </a>
            ))}
            <LinkButton to="/login" variant="ghost" className="mt-1 justify-start">
              Iniciar sesión
            </LinkButton>
          </Container>
        </nav>
      ) : null}
    </header>
  );
}
