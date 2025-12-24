import { useRouter } from 'next/navigation';
import { Button } from '@/components/Button';
import { RouteNamesEnum } from '@/localConstants';
import { UnlockPanelManager, useGetLoginInfo } from '@/lib';

export const ConnectButton = () => {
  const router = useRouter();
  const { isLoggedIn } = useGetLoginInfo();

  const handleClick = () => {
    if (isLoggedIn) {
      router.push(RouteNamesEnum.dcaboard);
      return;
    }

    const unlockPanelManager = UnlockPanelManager.init({
      loginHandler: () => {
        router.push(RouteNamesEnum.dcaboard);
      },
      onClose: () => {
        // Keep the current page visible behind the modal
      }
    });

    unlockPanelManager.openUnlockPanel();
  };

  return (
    <Button
      onClick={handleClick}
      className='inline-block rounded-lg px-3 py-2 text-sm text-center hover:no-underline my-0 bg-gray-800 text-white hover:bg-gray-700 mr-0 disabled:bg-gray-200 disabled:text-black disabled:cursor-not-allowed transition-colors whitespace-nowrap'
    >
      Connect
    </Button>
  );
};
