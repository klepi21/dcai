'use client';
import { usePathname, useRouter } from 'next/navigation';
import { Button, MxLink } from '@/components';
import { useGetIsLoggedIn } from '@/lib';
import { RouteNamesEnum } from '@/localConstants';
import dcaiLogo from '../../../../public/assets/img/dcailogo.png';
import Image from 'next/image';
import { ConnectButton, NotificationsButton } from './components';
import { useDcaBoardTheme } from '@/wrappers';
import SkyToggle from '@/components/ui/sky-toggle';

export const Header = () => {
  const isLoggedIn = useGetIsLoggedIn();
  const router = useRouter();
  const pathname = usePathname();
  const { isDark } = useDcaBoardTheme();

  const onClick = async () => {
    router.push(RouteNamesEnum.logout);
  };

  return (
    <header className='absolute top-0 left-0 right-0 z-30 flex justify-center bg-transparent'>
      <div className='flex w-full max-w-6xl items-center justify-between bg-[hsl(var(--background))] px-6 pt-4 pb-3 shadow-[0_1px_0_0_rgba(0,0,0,0.08)]'>
      <MxLink
        className='flex items-center justify-between'
          to={isLoggedIn ? RouteNamesEnum.dcaboard : RouteNamesEnum.home}
      >
          <Image
            src={dcaiLogo}
            alt='DCAi logo'
            className={`h-8 w-auto ${isDark ? 'invert' : ''}`}
          />
      </MxLink>

        <nav className='flex items-center text-sm'>
          <div className='flex items-center gap-2 flex-shrink-0'>
          {isLoggedIn && (
            <>
              <NotificationsButton />
                {pathname === RouteNamesEnum.dcaboard && (
                  <div className='mr-2'>
                    <SkyToggle />
                  </div>
                )}
              <Button
                onClick={onClick}
                  className='inline-block rounded-none px-3 h-10 text-sm text-center hover:no-underline my-0 bg-gray-800 text-white hover:bg-gray-700 mr-0 disabled:bg-gray-200 disabled:text-black disabled:cursor-not-allowed transition-colors whitespace-nowrap flex items-center justify-center'
              >
                  Disconnect
              </Button>
            </>
          )}

          {!isLoggedIn && <ConnectButton />}
        </div>
      </nav>
      </div>
    </header>
  );
};
