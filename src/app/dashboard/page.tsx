'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { RouteNamesEnum } from '@/localConstants';

export default function Dashboard() {
  const router = useRouter();

  useEffect(() => {
    router.replace(RouteNamesEnum.dcaboard);
  }, [router]);

  return null;
}
