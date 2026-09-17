import { Container } from '@atoms/Container.js';
import { LinkButton } from '@atoms/LinkButton.js';
import { ThemeToggle } from '@atoms/ThemeToggle.js';

const NAV_LINKS = [
  { href: '#ciclo', label: 'El ciclo' },
  { href: '#restricciones', label: 'Lo que no deja hacer' },
  { href: '#marco', label: 'Marco normativo' },
];

export function SiteHeader() {
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
          <LinkButton to="/dashboard" variant="secondary">
            Ir al panel
          </LinkButton>
        </div>
      </Container>
    </header>
  );
}
