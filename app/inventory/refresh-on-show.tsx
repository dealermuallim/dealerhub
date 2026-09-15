'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RefreshOnShow() {
  const router = useRouter();

  useEffect(() => {
    router.refresh();

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        router.refresh();
      }
    };

    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);

    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [router]);

  return null;
}
