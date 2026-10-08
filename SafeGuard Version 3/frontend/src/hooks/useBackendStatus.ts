import { useEffect, useState } from 'react';
import { getHealth } from '../services/api';

export type BackendStatus = 'checking' | 'online' | 'offline';

export function useBackendStatus(intervalMs = 15000): BackendStatus {
  const [status, setStatus] = useState<BackendStatus>('checking');
  useEffect(() => {
    let alive = true;
    const check = () => getHealth().then(() => alive && setStatus('online'), () => alive && setStatus('offline'));
    check();
    const id = setInterval(check, intervalMs);
    return () => { alive = false; clearInterval(id); };
  }, [intervalMs]);
  return status;
}
