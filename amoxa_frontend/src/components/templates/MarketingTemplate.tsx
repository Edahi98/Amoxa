import type { ReactNode } from 'react';
import { SiteHeader } from '@organisms-marketing/SiteHeader.js';
import { SiteFooter } from '@organisms-marketing/SiteFooter.js';

export interface MarketingTemplateProps {
  children: ReactNode;
}

export function MarketingTemplate({ children }: MarketingTemplateProps) {
  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />
      <main>{children}</main>
      <SiteFooter />
    </div>
  );
}
