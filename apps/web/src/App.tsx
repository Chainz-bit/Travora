import { useState, useEffect } from 'react';
import { useRouter } from './hooks/useRouter';
import { authService } from './features/auth/services/authService';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { HomePage } from './pages/public/HomePage';
import { SchedulesPage } from './pages/public/SchedulesPage';
import { LoadingState } from './components/ui/LoadingState';
import { ToastProvider } from './components/ui/Toast';

// Member & Auth Pages
import { LoginPage } from './features/auth/pages/LoginPage';
import { RegisterPage } from './features/auth/pages/RegisterPage';
import { MemberDashboardPage } from './features/member/pages/MemberDashboardPage';
import { BookingPage } from './features/member/pages/BookingPage';
import { PaymentConfirmationPage } from './features/member/pages/PaymentConfirmationPage';
import { BookingHistoryPage } from './features/member/pages/BookingHistoryPage';
import { ComplaintsPage } from './features/member/pages/ComplaintsPage';

// Admin Pages & Layout
import { AdminLayout } from './features/admin/components/AdminLayout';
import { AdminLoginPage } from './features/admin/pages/AdminLoginPage';
import { AdminDashboardPage } from './features/admin/pages/AdminDashboardPage';
import { CitiesManagementPage } from './features/admin/pages/CitiesManagementPage';
import { VehiclesManagementPage } from './features/admin/pages/VehiclesManagementPage';
import { SchedulesManagementPage } from './features/admin/pages/SchedulesManagementPage';
import { AdminComplaintsPage } from './features/admin/pages/AdminComplaintsPage';

// Operator Pages & Layout
import { OperatorLayout } from './features/operator/components/OperatorLayout';
import { OperatorLoginPage } from './features/operator/pages/OperatorLoginPage';
import { OperatorDashboardPage } from './features/operator/pages/OperatorDashboardPage';
import { PaymentVerificationsPage } from './features/operator/pages/PaymentVerificationsPage';
import { DepartureValidationPage } from './features/operator/pages/DepartureValidationPage';

import { getTodayDateString } from './lib/utils';
import type { SearchTicketFormValues } from './types/index';

export function App() {
  const { currentPath, searchParams, getParam, navigate } = useRouter();
  const [currentUser, setCurrentUser] = useState(() => authService.getCurrentUser());
  const [sessionLoading, setSessionLoading] = useState<boolean>(!authService.isInitialized());

  const isAdminRoute = currentPath.startsWith('/admin') && currentPath !== '/admin/login';
  const isOperatorRoute = currentPath.startsWith('/operator') && currentPath !== '/operator/login';
  const isMemberRoute = currentPath.startsWith('/member');

  // Inisialisasi dan sinkronisasi sesi cookie HttpOnly dengan backend PostgreSQL (/api/v1/auth/me)
  useEffect(() => {
    if (!authService.isInitialized()) {
      authService.initSession().then((user) => {
        setCurrentUser(user);
        setSessionLoading(false);
      });
    }

    const unsubscribe = authService.subscribe((user) => {
      setCurrentUser(user);
      setSessionLoading(!authService.isInitialized());
    });

    return unsubscribe;
  }, []);

  // Independent route guards per role (berdasarkan kebenaran data backend)
  useEffect(() => {
    if (sessionLoading) return;

    if (isAdminRoute && currentUser?.role !== 'admin') {
      navigate('/admin/login', { redirect: currentPath });
    } else if (isOperatorRoute && currentUser?.role !== 'operator') {
      navigate('/operator/login', { redirect: currentPath });
    } else if (isMemberRoute && currentUser?.role !== 'member') {
      navigate('/login', { redirect: currentPath });
    }
  }, [sessionLoading, isAdminRoute, isOperatorRoute, isMemberRoute, currentUser, currentPath, navigate]);

  function handleSearch(values: SearchTicketFormValues) {
    navigate('/schedules', values);
  }

  function handleQuickRouteSelect(originId: string, destinationId: string) {
    navigate('/schedules', {
      originCityId: originId,
      destinationCityId: destinationId,
      departureDate: getTodayDateString(),
    });
  }

  const renderRouteContent = () => {
    // Tampilkan loading saat memeriksa sesi pada rute terproteksi
    if ((isAdminRoute || isOperatorRoute || isMemberRoute) && sessionLoading) {
      return (
        <div className="min-h-screen bg-canvas-public flex flex-col items-center justify-center p-6">
          <LoadingState message="Memeriksa sesi autentikasi akun..." />
        </div>
      );
    }

    // ==========================================
    // 1. ADMIN PORTAL ROUTES
    // ==========================================
    if (currentPath === '/admin/login') {
      return (
        <AdminLoginPage
          onNavigate={navigate}
          redirectPath={getParam('redirect')}
        />
      );
    }

    if (isAdminRoute) {
      if (currentUser?.role !== 'admin') {
        return (
          <AdminLoginPage
            onNavigate={navigate}
            redirectPath={currentPath}
          />
        );
      }

      return (
        <AdminLayout currentPath={currentPath} onNavigate={navigate}>
          {currentPath === '/admin/origin-cities' && (
            <CitiesManagementPage type="origin" onNavigate={navigate} />
          )}
          {currentPath === '/admin/destination-cities' && (
            <CitiesManagementPage type="destination" onNavigate={navigate} />
          )}
          {currentPath === '/admin/vehicles' && (
            <VehiclesManagementPage />
          )}
          {currentPath === '/admin/schedules' && (
            <SchedulesManagementPage />
          )}
          {currentPath === '/admin/complaints' && (
            <AdminComplaintsPage />
          )}
          {currentPath === '/admin' && (
            <AdminDashboardPage onNavigate={navigate} />
          )}
        </AdminLayout>
      );
    }

    // ==========================================
    // 2. OPERATOR LOKET PORTAL ROUTES
    // ==========================================
    if (currentPath === '/operator/login') {
      return (
        <OperatorLoginPage
          onNavigate={navigate}
          redirectPath={getParam('redirect')}
        />
      );
    }

    if (isOperatorRoute) {
      if (currentUser?.role !== 'operator') {
        return (
          <OperatorLoginPage
            onNavigate={navigate}
            redirectPath={currentPath}
          />
        );
      }

      return (
        <OperatorLayout currentPath={currentPath} onNavigate={navigate}>
          {currentPath === '/operator/confirmations' && (
            <PaymentVerificationsPage />
          )}
          {currentPath === '/operator/validation' && (
            <DepartureValidationPage />
          )}
          {currentPath === '/operator' && (
            <OperatorDashboardPage onNavigate={navigate} />
          )}
        </OperatorLayout>
      );
    }

    // ==========================================
    // 3. MEMBER PORTAL ROUTES
    // ==========================================
    if (currentPath === '/login') {
      const roleParam = getParam('role');
      const validRole = roleParam === 'admin' || roleParam === 'operator' || roleParam === 'member' ? roleParam : 'member';
      return (
        <LoginPage
          onNavigate={navigate}
          redirectPath={getParam('redirect')}
          defaultRole={validRole}
        />
      );
    }

    if (currentPath === '/register') {
      return <RegisterPage onNavigate={navigate} />;
    }

    if (isMemberRoute) {
      if (currentUser?.role !== 'member') {
        return (
          <LoginPage
            onNavigate={navigate}
            redirectPath={currentPath}
          />
        );
      }

      if (currentPath === '/member/booking') {
        return (
          <BookingPage
            onNavigate={navigate}
            initialScheduleId={getParam('scheduleId')}
          />
        );
      }

      if (currentPath === '/member/payment-confirmation') {
        return (
          <PaymentConfirmationPage
            onNavigate={navigate}
            initialBookingId={getParam('bookingId')}
          />
        );
      }

      if (currentPath === '/member/history') {
        return <BookingHistoryPage onNavigate={navigate} />;
      }

      if (currentPath === '/member/complaints') {
        return <ComplaintsPage onNavigate={navigate} />;
      }

      return <MemberDashboardPage onNavigate={navigate} />;
    }

    // ==========================================
    // 4. PUBLIC ROUTES (Navbar & Footer)
    // ==========================================
    return (
      <div className="min-h-screen flex flex-col bg-canvas-public text-stone-900 selection:bg-primary selection:text-white w-full max-w-full overflow-x-hidden">
        <Navbar
          currentPath={currentPath}
          onNavigate={(path) => navigate(path)}
        />

        <main className="flex-1 flex flex-col">
          {currentPath === '/schedules' ? (
            <SchedulesPage
              initialSearchValues={searchParams}
              onNavigateHome={() => navigate('/')}
              onNavigate={navigate}
            />
          ) : (
            <HomePage
              onSearch={handleSearch}
              onQuickRouteSelect={handleQuickRouteSelect}
            />
          )}
        </main>

        <Footer onNavigate={navigate} />
      </div>
    );
  };

  return (
    <ToastProvider>
      <div key={currentPath} className="animate-page-enter">
        {renderRouteContent()}
      </div>
    </ToastProvider>
  );
}

export default App;
