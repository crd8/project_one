import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardAction, CardContent } from './ui/card';
import { Alert, AlertTitle } from './ui/alert';
import { InfoIcon } from 'lucide-react';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const params = new URLSearchParams();
    params.append('username', username);
    params.append('password', password);

    try {
      const response = await api.post('/token', params);
      await login(response.data.access_token);
      navigate('/');
    } catch (err) {
      setError('Login failed. Incorrect username or password.');
    }
  };

  return (
    <Card className='px-5 max-w-sm mx-auto mt-5'>
      <CardHeader>
        <CardTitle>Login to your account</CardTitle>
        <CardDescription>
          Enter your username below to login to your account
        </CardDescription>
        <CardAction>
          <Button variant="link"><Link to="/register">Sign up</Link></Button> 
        </CardAction>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <div className='flex flex-col gap-6'>
            <div className='grid gap-2'>
              <Label htmlFor='username'>Username</Label>
              <Input type="text" value={username} onChange={(e) => setUsername(e.target.value)} required />
            </div>
            <div className='grid gap-2'>
              <div className='flex items-center'>
                <Label htmlFor='password'>Password</Label>
                <a
                  href="#"
                  className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                >
                  Forgot your password?
                </a>
              </div>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <Button type="submit" className='w-full'>Login</Button>
          </div>          
        </form>
        {error && 
          <Alert className='mt-3' variant='destructive'>
            <InfoIcon />
            <AlertTitle>{error}</AlertTitle>
          </Alert>
        }
      </CardContent>
    </Card>
  );
};

export default Login;