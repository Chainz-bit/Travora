import type { ScheduleViewModel } from '../types/index';
import { sharedStore } from '../features/shared/services/sharedStore';

/**
 * DEMO DATA: Simulasi Jadwal Perjalanan
 * Terhubung secara dinamis dengan Shared Local Mock Store Travora.
 */
export function getActiveSchedules(): ScheduleViewModel[] {
  return sharedStore.getSchedules(true);
}

export const DEMO_SCHEDULES: ScheduleViewModel[] = new Proxy([] as ScheduleViewModel[], {
  get(_target, prop, receiver) {
    const list = sharedStore.getSchedules(true);
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

