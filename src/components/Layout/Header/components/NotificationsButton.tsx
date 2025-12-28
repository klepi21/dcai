import { faBell } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Button } from '@/components/Button';
import { NotificationsFeedManager } from '@/lib';

export const NotificationsButton = () => {
  const handleOpenNotificationsFeed = () => {
    NotificationsFeedManager.getInstance().openNotificationsFeed();
  };

  return (
    <Button
      onClick={handleOpenNotificationsFeed}
      className='inline-block rounded-none px-3 h-10 text-center hover:no-underline my-0 text-gray-600 hover:bg-slate-100 mx-0 flex items-center justify-center'
    >
      <FontAwesomeIcon icon={faBell} />
    </Button>
  );
};
