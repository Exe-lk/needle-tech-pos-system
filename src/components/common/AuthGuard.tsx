'use client';

import { useLayoutEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { getAccessToken, getRefreshToken } from '@/lib/auth-client';
import { isPublicAuthPath, loginPathFor } from '@/lib/auth-constants';

function hasSession(): boolean {
  return Boolean(getAccessToken() || getRefreshToken());
}

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [allowed, setAllowed] = useState(() => isPublicAuthPath(pathname));

  useLayoutEffect(() => {
    if (isPublicAuthPath(pathname)) {
      setAllowed(true);
      return;
    }

    if (!hasSession()) {
      setAllowed(false);
      window.location.replace(loginPathFor(pathname));
      return;
    }

    setAllowed(true);
  }, [pathname]);

  if (!allowed) {
    return <div className="min-h-full bg-zinc-50 dark:bg-slate-900" aria-hidden="true" />;
  }

  return <>{children}</>;
}
