'use client';

import { LandingHeader, LandingFooter } from './chrome';
import { Hero, TrustBar, CollateralGrid, HowItWorks } from './sections';
import { ProductCards, Testimonial, FinalCta } from './conversion';
import { useBusinessInfo } from './use-business';

export function LandingSections() {
  const info = useBusinessInfo();
  return (
    <div className="min-h-dvh bg-white">
      <LandingHeader />
      <main>
        <Hero locations={info.locations} />
        <TrustBar />
        <CollateralGrid />
        <HowItWorks />
        <ProductCards />
        <Testimonial />
        <FinalCta />
      </main>
      <LandingFooter info={info} />
    </div>
  );
}
