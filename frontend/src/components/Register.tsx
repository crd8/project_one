import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardAction, CardContent } from './ui/card';
import { Label } from './ui/label';
import { Alert, AlertTitle } from './ui/alert';
import { InfoIcon } from 'lucide-react';

const Register: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [fullname, setFullname] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await api.post('/users/', { email, password, username, fullname });
      alert('Registrasi berhasil! Silakan login.');
      navigate('/login');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Registrasi gagal.');
    }
  };

  return (
    <Card className='px-5 max-w-xl mx-auto mt-5'>
      <CardHeader>
        <CardTitle>Register a new account</CardTitle>
        <CardDescription>
          Fill in the details below to create a new account
        </CardDescription>
        <CardAction>
          <Button variant="link"><Link to="/login">Login</Link></Button> 
        </CardAction>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <div className='grid grid-cols-2 gap-6'>
            <div className='grid gap-2'>
              <Label htmlFor='username'>Username</Label>
              <Input type="text" value={username} onChange={(e) => setUsername(e.target.value)} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="fullname">Fullname</Label>
              <Input type="text" value={fullname} onChange={(e) => setFullname(e.target.value)} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Password</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
          </div>
          <Button type="submit" className='w-full mt-6'>Register</Button>
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

export default Register;