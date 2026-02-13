import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { getAccessToken, isLoading } = useAuth();

  if (isLoading) return <div>Loading...</div>;

  return getAccessToken() ? <>{children}</> : <Navigate to="/login" replace />;
};

export default ProtectedRoute;