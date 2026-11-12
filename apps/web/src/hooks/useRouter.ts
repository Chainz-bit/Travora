import { useState, useEffect, useCallback } from 'react';
import type { SearchTicketFormValues } from '../types/index';

export type RoutePath =
  | '/'
  | '/schedules'
  | '/login'
  | '/register'
  | '/member'
  | '/member/booking'
  | '/member/payment-confirmation'
  | '/member/history'
  | '/member/complaints'
  | '/admin/login'
  | '/admin'
  | '/admin/origin-cities'
  | '/admin/destination-cities'
  | '/admin/vehicles'
  | '/admin/schedules'
  | '/admin/complaints'
  | '/operator/login'
  | '/operator'
  | '/operator/confirmations'
  | '/operator/validation';

function parseCurrentPath(): RoutePath {
  if (typeof window === 'undefined') return '/';
  const pathname = window.location.pathname;

  // Admin routes
  if (pathname.startsWith('/admin/login')) return '/admin/login';
  if (pathname.startsWith('/admin/origin-cities')) return '/admin/origin-cities';
  if (pathname.startsWith('/admin/destination-cities')) return '/admin/destination-cities';
  if (pathname.startsWith('/admin/vehicles')) return '/admin/vehicles';
  if (pathname.startsWith('/admin/schedules')) return '/admin/schedules';
  if (pathname.startsWith('/admin/complaints')) return '/admin/complaints';
  if (pathname.startsWith('/admin')) return '/admin';

  // Operator routes
  if (pathname.startsWith('/operator/login')) return '/operator/login';
  if (pathname.startsWith('/operator/confirmations')) return '/operator/confirmations';
  if (pathname.startsWith('/operator/validation')) return '/operator/validation';
  if (pathname.startsWith('/operator')) return '/operator';

  // Member routes
  if (pathname.startsWith('/member/booking')) return '/member/booking';
  if (pathname.startsWith('/member/payment-confirmation')) return '/member/payment-confirmation';
  if (pathname.startsWith('/member/history')) return '/member/history';
  if (pathname.startsWith('/member/complaints')) return '/member/complaints';
  if (pathname.startsWith('/member')) return '/member';

  // Public & Auth routes
  if (pathname.startsWith('/login')) return '/login';
  if (pathname.startsWith('/register')) return '/register';
  if (pathname.startsWith('/schedules')) return '/schedules';
  return '/';
}

export function useRouter() {
  const [currentPath, setCurrentPath] = useState<RoutePath>(parseCurrentPath);

  const [searchParams, setSearchParams] = useState<SearchTicketFormValues | undefined>(() => {
    if (typeof window === 'undefined') return undefined;
    const urlParams = new URLSearchParams(window.location.search);
    const originCityId = urlParams.get('origin') || '';
    const destinationCityId = urlParams.get('destination') || '';
    const departureDate = urlParams.get('date') || '';
    if (originCityId && destinationCityId && departureDate) {
      return { originCityId, destinationCityId, departureDate };
    }
    return undefined;
  });

  const getParam = useCallback((key: string): string | null => {
    if (typeof window === 'undefined') return null;
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(key);
  }, []);

  useEffect(() => {
    function onPopState() {
      setCurrentPath(parseCurrentPath());
      const urlParams = new URLSearchParams(window.location.search);
      const originCityId = urlParams.get('origin') || '';
      const destinationCityId = urlParams.get('destination') || '';
      const departureDate = urlParams.get('date') || '';
      if (originCityId && destinationCityId && departureDate) {
        setSearchParams({ originCityId, destinationCityId, departureDate });
      }
    }

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigate = useCallback(
    (path: RoutePath, params?: Record<string, string> | SearchTicketFormValues) => {
      if (params) {
        if ('originCityId' in params) {
          const ticketParams = params as SearchTicketFormValues;
          setSearchParams(ticketParams);
          const query = new URLSearchParams({
            origin: ticketParams.originCityId,
            destination: ticketParams.destinationCityId,
            date: ticketParams.departureDate,
          }).toString();
          window.history.pushState({}, '', `${path}?${query}`);
        } else {
          const query = new URLSearchParams(params as Record<string, string>).toString();
          window.history.pushState({}, '', query ? `${path}?${query}` : path);
        }
      } else {
        window.history.pushState({}, '', path);
      }
      setCurrentPath(path);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    []
  );

  return {
    currentPath,
    searchParams,
    getParam,
    navigate,
  };
}
