import { useEffect, useRef } from 'react';
import { captureWithSession } from '@/utils/analytics';

const MIN_DURATION_SECONDS = 3;

export function useScreenTracking(screenName: string) {
  const enteredAt = useRef<number>(Date.now());

  useEffect(() => {
    enteredAt.current = Date.now();

    return () => {
      const duration = Math.round((Date.now() - enteredAt.current) / 1000);
      if (duration >= MIN_DURATION_SECONDS) {
        captureWithSession('screen_time', {
          screen_name: screenName,
          duration_seconds: duration,
        });
      }
    };
  }, [screenName]);
}
