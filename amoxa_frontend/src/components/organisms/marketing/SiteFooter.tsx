import { Container } from '@atoms/Container.js';

export function SiteFooter() {
  return (
    <footer className="border-t border-white/50 py-10 dark:border-white/10">
      <Container className="flex flex-col items-center justify-between gap-4 text-sm text-muted-foreground md:flex-row">
        <p>Amoxa — Auditorías internas ISO 9001 / ISO 19011.</p>
        <p>© {new Date().getFullYear()} Amoxa. Edahi Yaxquin Ávila García.</p>
      </Container>
    </footer>
  );
}
