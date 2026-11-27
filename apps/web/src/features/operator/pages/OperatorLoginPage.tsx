import type { RoutePath } from '../../../hooks/useRouter';
import { LoginPage } from '../../auth/pages/LoginPage';

export interface OperatorLoginPageProps {
  onNavigate: (path: RoutePath) => void;
  redirectPath?: string | null;
}

export function OperatorLoginPage({ onNavigate, redirectPath }: OperatorLoginPageProps) {
  return (
    <LoginPage
      onNavigate={onNavigate}
      redirectPath={redirectPath || '/operator'}
      defaultRole="operator"
    />
  );
}
