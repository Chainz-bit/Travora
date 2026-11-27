import type { CityOption } from '../types/index';
import { sharedStore } from '../features/shared/services/sharedStore';

/**
 * DEMO DATA: Daftar Kota Operasional
 * Terhubung secara dinamis dengan Shared Local Mock Store Travora.
 */
export function getOperationalCities(): CityOption[] {
  return sharedStore.getOriginCities();
}

export const DEMO_CITIES: CityOption[] = new Proxy([] as CityOption[], {
  get(_target, prop, receiver) {
    const list = sharedStore.getOriginCities();
    if (prop === 'length') return list.length;
    if (typeof prop === 'string' && !isNaN(Number(prop))) {
      return list[Number(prop)];
    }
    const val = (list as unknown as Record<string | symbol, unknown>)[prop];
    if (typeof val === 'function') {
      return (val as (...args: unknown[]) => unknown).bind(list);
    }
    return Reflect.get(list, prop, receiver);
  },
});

