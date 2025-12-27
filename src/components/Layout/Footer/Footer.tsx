import heartIcon from '../../../../public/assets/img/heart.svg';
import Image from 'next/image';

export const Footer = () => {
  return (
    <footer className='mx-auto w-full max-w-prose pb-6 pl-6 pr-6 text-center text-gray-400 mt-16'>
      <div className='flex flex-col items-center gap-3 text-sm text-gray-400'>
        <a
          className='text-gray-400 hover:cursor-pointer hover:underline'
          href='/docs'
        >
          Documentation
        </a>
        <a
          target='_blank'
          className='flex items-center hover:underline'
          href='https://multiversx.com/'
        >
          Built on <Image src={heartIcon} alt='love' className='mx-1' />{' '}
          MultiversX
        </a>
      </div>
    </footer>
  );
};
