import { MarketingTemplate } from '@templates/MarketingTemplate.js';
import { HeroSection } from '@organisms-marketing/HeroSection.js';
import { FrameworkSection } from '@organisms-marketing/FrameworkSection.js';
import { CycleSection } from '@organisms-marketing/CycleSection.js';
import { RestrictionsSection } from '@organisms-marketing/RestrictionsSection.js';
import { FinalCtaSection } from '@organisms-marketing/FinalCtaSection.js';

export function Home() {
  return (
    <MarketingTemplate>
      <HeroSection />
      <FrameworkSection />
      <CycleSection />
      <RestrictionsSection />
      <FinalCtaSection />
    </MarketingTemplate>
  );
}
