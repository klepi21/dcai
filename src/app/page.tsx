import { AuthRedirectWrapper } from '@/wrappers';
import { AnomalousMatterHero } from '@/components/ui/anomalous-matter-hero';
import HeroOrbitDeck from '@/components/ui/hero-modern';

export default function Home() {
  return (
    <AuthRedirectWrapper requireAuth={false}>
      <div className='relative w-full'>
        <div className='relative h-screen w-full'>
          <AnomalousMatterHero />
        </div>
        <HeroOrbitDeck />
      </div>
    </AuthRedirectWrapper>
  );
}
