import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import PublicRoute from './routes/PublicRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import { useAuth } from './context/AuthContext';
import SessionTimer from './components/common/SessionTimer';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import { Button } from './components/ui/button';
import { Toaster } from "./components/ui/sonner";
import { Loader2 } from 'lucide-react';

const FullPageLoader = () => (
  <div className="fixed inset-0 flex flex-col items-center justify-center bg-white z-50">
    <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
    <p className="text-sm font-medium text-muted-foreground animate-pulse">
      Preparing your session...
    </p>
  </div>
);

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { getAccessToken, isLoading } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!getAccessToken()) {
    return <Navigate to="/login" />;
  }

  return <>{children}</>;
};

const HomePage = () => {
    const { user } = useAuth();
    const [greeting, setGreeting] = useState("");

    const updateGreeting = () => {
      const hour = new Date().getHours();
      if (hour < 11) setGreeting("Good morning");
      else if (hour < 15) setGreeting("Good afternoon");
      else if (hour < 18) setGreeting("Good evening");
      else setGreeting("Good night");
    }

    useEffect(() => {
      updateGreeting();
      const timer = setInterval(updateGreeting, 60000);
      return () => clearInterval(timer);
    }, []);

    if (user) {
      const displayName = user.fullname ? user.fullname : user.username;
      return (
        <div className="space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h2 className="text-2xl font-bold tracking-tight">
            {greeting}, {displayName}!
          </h2>
          <p className="text-muted-foreground">
            It's good to see you back. What would you like to do today?
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <h2 className="text-2xl font-bold tracking-tight">
          {greeting}!
        </h2>
        <p className="text-muted-foreground">
          Please log in or register a new account to begin the full experience.
        </p>
      </div>
    );
};

const Navbar = () => {
  const { getAccessToken, logout } = useAuth();
  const token = getAccessToken();
  const location = useLocation();

  const handleLogout = () => {
    logout();
  };

  const renderAuthButton = () => {
    if (token) {
      return (
        <>
          <SessionTimer />
          <Button variant="outline" onClick={handleLogout}>Logout</Button>
        </>
      );
    }

    const path = location.pathname;

    if (path === '/login') {
      return (
        <Button asChild>
          <Link to="/register">Sign up</Link>
        </Button>
      );
    } else if (path === '/register') {
      return (
        <Button asChild>
          <Link to="/login">Login</Link>
        </Button>
      );
    } else {
      return (
        <Button asChild>
          <Link to="/login">Login</Link>
        </Button>
      );
    }
  };

  return (
    <nav className='bg-neutral-100 flex items-center justify-between px-5 py-3 border-b'>
      <div className="flex items-center space-x-4">
        <Link to="/" className="font-semibold text-lg tracking-tight">MyApp</Link>
        
        <Button variant="link" asChild className="p-0 text-neutral-600">
          <Link to="/">Home</Link>
        </Button>
        
        {token && (
          <Button variant="link" asChild className="p-0 text-neutral-600">
            <Link to="/profile">Profile</Link>
          </Button>
        )}
      </div>
      
      <div className="flex items-center space-x-4">
        {renderAuthButton()}
      </div>
    </nav>
  );
};

const App: React.FC = () => {
  const { isLoading } = useAuth();

  if (isLoading) {
    return <FullPageLoader />;
  }
    
  return (
    <Router>
      <div className="min-h-screen bg-background font-sans antialiased">
        <Navbar />
        
        <div className="p-5 max-w-7xl mx-auto">
          <Routes>
            <Route 
              path="/login"
              element={
                <PublicRoute>
                  <Login/>
                </PublicRoute>
              } 
            />
            <Route
              path="/register"
              element={
                <PublicRoute>
                  <Register />
                </PublicRoute>
              }
            />
            <Route 
              path="/forgot-password" 
              element={
                <PublicRoute>
                  <ForgotPassword />
                </PublicRoute>
              } 
            />
            <Route 
              path="/reset-password" 
              element={
                <PublicRoute>
                  <ResetPassword />
                </PublicRoute>
              } 
            />
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
        <Toaster position="top-center" />
      </div>
    </Router>
  );
};

export default App;