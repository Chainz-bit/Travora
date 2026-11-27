import type { RoutePath } from '../../../hooks/useRouter';
import { LoginPage } from '../../auth/pages/LoginPage';

export interface AdminLoginPageProps {
  onNavigate: (path: RoutePath) => void;
  redirectPath?: string | null;
}

export function AdminLoginPage({ onNavigate, redirectPath }: AdminLoginPageProps) {
  return (
    <LoginPage
      onNavigate={onNavigate}
      redirectPath={redirectPath || '/admin'}
      defaultRole="admin"
    />
  );
}
