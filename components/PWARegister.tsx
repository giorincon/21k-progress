'use client';

import { useEffect } from 'react';

export default function PWARegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const register = async () => {
      try {
        const swUrl = new URL('./sw.js', window.location.href);
        const scopeUrl = new URL('./', window.location.href);

        await navigator.serviceWorker.register(swUrl.pathname, {
          scope: scopeUrl.pathname
        });
      } catch (error) {
        console.warn(
          '21K Progress: no se pudo registrar el service worker',
          error
        );
      }
    };

    window.addEventListener('load', register, { once: true });

    return () => window.removeEventListener('load', register);
  }, []);

  return null;
}
