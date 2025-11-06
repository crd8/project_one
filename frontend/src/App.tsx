import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Register from './components/Register';
import Profile from './components/Profile';
import { useAuth } from './context/AuthContext';
import SessionTimer from './components/SessionTimer';

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
        <nav className='bg-neutral-100 flex items-center px-5 py-3'>
          <ul className='flex'>
            <li className='px-2'><Link to="/">Home</Link></li>
            {!token && <li className='px-2'><Link to="/login">Login</Link></li>}
            {!token && <li className='px-2'><Link to="/register">Register</Link></li>}
            {token && <li className='px-2'><Link to="/profile">Profile</Link></li>}
            {token && <li className='px-2'><button onClick={handleLogout}>Logout</button></li>}
          </ul>
          {token && <SessionTimer />}
        </nav>
        <hr />
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
    </Router>
  );
};

export default App;