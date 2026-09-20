'use client';

import { LandingHeader, LandingFooter } from './chrome';
import {
  Hero,
  StatsBar,
  CollateralGrid,
  HowItWorks,
  TrustStrip,
  Testimonial,
  FinalCta,
} from './sections';
import { ProductCards } from './conversion';
import { useBusinessInfo } from './use-business';
import { useReveal } from '@/hooks/use-reveal';
import { ApplyProvider } from '@/components/marketing/apply-provider';

export function LandingSections() {
  const info = useBusinessInfo();
  const rootRef = useReveal();

  return (
    <ApplyProvider>
      <div ref={rootRef}>
        <LandingHeader />
        <main>
          <Hero />
          <StatsBar locations={info.locations} />
          <CollateralGrid />
          <HowItWorks />
          <ProductCards />
          <TrustStrip />
          <Testimonial />
          <FinalCta info={info} />
        </main>
        <LandingFooter info={info} />
      </div>
    </ApplyProvider>
  );
}