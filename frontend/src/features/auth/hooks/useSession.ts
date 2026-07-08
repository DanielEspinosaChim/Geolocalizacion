import { useSyncExternalStore } from 'react';
import { getSessionSnapshot, subscribeSession, type SessionSnapshot } from '@core/auth';

/** Sesión reactiva (usuario + rol). Los loaders usan getSessionUser de @core/auth. */
export function useSession(): SessionSnapshot {
  return useSyncExternalStore(subscribeSession, getSessionSnapshot);
}
