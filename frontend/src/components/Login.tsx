import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { AxiosError } from 'axios';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardAction, CardContent } from "./ui/card";
import { Alert, AlertTitle } from './ui/alert';
import { InfoIcon, Lock } from 'lucide-react';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./ui/form";

const loginSchema = z.object({
  username: z.string().min(1, { message: "Username cannot be blank." }),
  password: z.string().min(1, { message: "Password cannot be blank." }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [loginStep, setLoginStep] = useState<1 | 2>(1);
  const [tempToken, setTempToken] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [isResetLoading, setIsResetLoading] = useState(false);

  const handleRequestReset = async () => {
    const emailInput = prompt("Enter your account email to reset 2FA:");
    if (!emailInput) return;

    setIsResetLoading(true);
    try {
      await api.post('/auth/2fa/request-reset', { email: emailInput });
      alert("Check your email (including spam folder) for the reset link.");
    } catch (error) {
      alert("Failed to send request.")
    } finally {
      setIsResetLoading(false);
    }
  }

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });

  const onCredentialsSubmit = async (data: LoginFormValues) => {
    const params = new URLSearchParams();
    params.append('username', data.username);
    params.append('password', data.password);

    try {
      const response = await api.post('/token', params);
      const responseData = response.data;

      if (responseData.require_2fa) {
        setTempToken(responseData.temp_token);
        setLoginStep(2);
      } else {
        login(responseData.user, responseData.access_token);
        navigate('/');
      }
    } catch (err: unknown) {
      handleLoginError(err);
    }
  };

  const onOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError("");
    setIsLoading(true);

    try {
      const response = await api.post('/auth/2fa/verify-login', {
        temp_token: tempToken,
        code: otp
      });
      
      login(response.data.user, response.data.access_token);
      navigate('/');

    } catch (err: unknown) {
      if (err instanceof AxiosError && err.response?.status === 400) {
        setOtpError("Wrong OTP code.");
      } else {
        setOtpError("Failed to verify. Session may expire.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginError = (err: unknown) => {
    let errorMessage = "Login failed.";
    if (err instanceof AxiosError) {
      if (err.response?.status === 429) errorMessage = "Too many login attempts.";
      else if (err.response?.status === 401) errorMessage = "Incorrect username or password.";
    }
    form.setError("root", { message: errorMessage });
  };

  return (
    <Card className='px-5 max-w-sm mx-auto mt-5'>
      <CardHeader>
        <CardTitle>{loginStep === 1 ? "Login" : "Two-Factor Authentication"}</CardTitle>
        <CardDescription>
          {loginStep === 1 
            ? "Enter your credentials below" 
            : "Enter the 6-digit code from your authenticator app"}
        </CardDescription>
        {loginStep === 1 && (
          <CardAction>
            <Button variant="link"><Link to="/register">Sign up</Link></Button> 
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        {loginStep === 1 && (
          <Form {...form}>
          <form onSubmit={form.handleSubmit(onCredentialsSubmit)} className="space-y-6">
              
            {form.formState.errors.root && (
            <Alert variant='destructive'>
              <InfoIcon className="h-4 w-4" />
              <AlertTitle>{form.formState.errors.root.message}</AlertTitle>
            </Alert>
            )}

            <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl><Input {...field} /></FormControl>
              <FormMessage />
              </FormItem>
            )}
            />

            <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl><Input type="password" {...field} /></FormControl>
              <FormMessage />
              </FormItem>
            )}
            />
            
            <Button type="submit" className='w-full' disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Verifying..." : "Login"}
            </Button>
          </form>
          </Form>
        )}

        {loginStep === 2 && (
          <form onSubmit={onOtpSubmit} className="space-y-6 animate-in fade-in slide-in-from-right-4">
            {otpError && (
              <Alert variant='destructive'>
                <InfoIcon className="h-4 w-4" />
                <AlertTitle>{otpError}</AlertTitle>
              </Alert>
            )}

            <div className="space-y-2">
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-neutral-200 rounded-full">
                  <Lock className="w-8 h-8 text-neutral-800" />
                </div>
              </div>
              <Input 
                autoFocus
                className="text-center text-2xl tracking-[0.5em] h-14 font-mono"
                placeholder="000000"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
              />
            </div>

            <Button type="submit" className='w-full' disabled={isLoading || otp.length < 6}>
              {isLoading ? "Verifying..." : "Verify Code"}
            </Button>

            <div className="text-center mt-4">
              <button 
                type="button"
                onClick={handleRequestReset}
                className="text-xs text-blue-600 hover:underline"
                disabled={isResetLoading}
              >
                {isResetLoading ? "Mengirim..." : "HP Hilang / Authenticator Terhapus?"}
              </button>
            </div>
            
            <Button 
              type="button" 
              variant="ghost" 
              className="w-full mt-2" 
              onClick={() => { setLoginStep(1); setOtp(""); }}
            >
              Back to Login
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
};

export default Login;