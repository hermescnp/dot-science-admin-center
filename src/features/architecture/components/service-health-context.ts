'use client';

import { createContext } from 'react';
import type { ServiceHealth } from '../api/types';

export interface ServiceHealthContextValue {
  services: ReadonlyMap<string, ServiceHealth> | null;
  error: boolean;
}

export const ServiceHealthContext = createContext<ServiceHealthContextValue>({
  services: null,
  error: false
});
