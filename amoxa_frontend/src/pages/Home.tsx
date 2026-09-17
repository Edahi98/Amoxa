import { MarketingTemplate } from '@templates/MarketingTemplate.js';
import { HeroSection } from '@organisms/HeroSection.js';
import { FrameworkSection } from '@organisms/FrameworkSection.js';
import { CycleSection } from '@organisms/CycleSection.js';
import { RestrictionsSection } from '@organisms/RestrictionsSection.js';
import { FinalCtaSection } from '@organisms/FinalCtaSection.js';

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
