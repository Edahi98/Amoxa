import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from '@phosphor-icons/react';

export interface AuthTemplateProps {
  title: string;
  subtitle: string;
  children: ReactNode;
}

export function AuthTemplate({ title, subtitle, children }: AuthTemplateProps) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-6 py-16">
      <div className="w-full max-w-sm">
        <Link
          to="/"
          className="-ml-2 inline-flex items-center gap-1.5 rounded-lg px-2 py-2.5 text-lg font-bold tracking-tight text-foreground transition-colors duration-200 hover:bg-muted"
        >
          <ArrowLeft size={18} weight="bold" aria-hidden="true" className="text-muted-foreground" />
          Amoxa
        </Link>
        <h1 className="mt-8 text-2xl font-bold tracking-tight text-foreground">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
        <div className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-sm">{children}</div>
      </div>
    </div>
  );
}
