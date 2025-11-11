import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Register from './components/Register';
import Profile from './components/Profile';
import { useAuth } from './context/AuthContext';
import SessionTimer from './components/SessionTimer';
import { Button } from './components/ui/button';
import { Toaster } from "./components/ui/sonner";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { token, isLoading } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!token) {
    return <Navigate to="/login" />;
  }

  return <>{children}</>;
};

const HomePage = () => {
    const { user, isLoading } = useAuth();
    
    if (isLoading) {
        return <div>Loading...</div>;
    }

    if (user) {
      const displayName = user.fullname ? user.fullname : user.username;
      return <h2>Selamat Datang, {displayName}!</h2>;
    }

    return <h2>Selamat Datang! Silakan Login atau Register.</h2>;
};

const App: React.FC = () => {
    const { token, logout } = useAuth();
    
    const handleLogout = () => {
        logout();
    };
    
  return (
    <Router>
      <div>
        <nav className='bg-neutral-100 flex items-center justify-between px-5 py-3 border-b'>
          
          <div className="flex items-center space-x-4">
            <Link to="/" className="font-semibold">MyApp</Link>
            
            <Button variant="link" asChild className="p-0">
              <Link to="/">Home</Link>
            </Button>
            
            {token && (
              <Button variant="link" asChild className="p-0">
                <Link to="/profile">Profile</Link>
              </Button>
            )}
          </div>
          
          <div className="flex items-center space-x-4">
            {token ? (
              <>
                <SessionTimer />
                <Button variant="outline" onClick={handleLogout}>Logout</Button>
              </>
            ) : (
              <>
                <Button variant="link" asChild className="p-0">
                  <Link to="/login">Login</Link>
                </Button>
                <Button asChild>
                  <Link to="/register">Sign up</Link>
                </Button>
              </>
            )}
          </div>
        </nav>
        
        <div className="p-5">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route path="/" element={<HomePage />} />
          </Routes>
        </div>
        <Toaster
          position="top-center"
        />
      </div>
    </Router>
  );
};

export default App;