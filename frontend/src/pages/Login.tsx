import React, { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { AxiosError } from 'axios';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardAction, CardContent } from "../components/ui/card";
import { Alert, AlertTitle } from '../components/ui/alert';
import { InfoIcon, Lock, Loader2 } from 'lucide-react';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../components/ui/form";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from "../components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";

// schema login
const loginSchema = z.object({
  username: z.string().min(1, { message: "Username cannot be blank." }),
  password: z.string().min(1, { message: "Password cannot be blank." }),
});

// schema reset 2fa
const resetSchema = z.object({
  email: z.string().email({ message: "Invalid email format." }),
});

type LoginFormValues = z.infer<typeof loginSchema>;
type ResetFormValues = z.infer<typeof resetSchema>;

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // State Login
  const [loginStep, setLoginStep] = useState<1 | 2>(1);
  const [tempToken, setTempToken] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  const [isLoginLoading, setIsLoginLoading] = useState(false);
  const [otpError, setOtpError] = useState("");

  // State Modal Reset
  const [isResetOpen, setIsResetOpen] = useState(false);
  
  // State Dialog success
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [dialogMessage, setDialogMessage] = useState("");

  // form login
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });

  // form reset 2fa
  const resetForm = useForm<ResetFormValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: { email: "" },
  });

  // handler login
  const onCredentialsSubmit = async (data: LoginFormValues) => {
    const params = new URLSearchParams();
    params.append('username', data.username);
    params.append('password', data.password);

    try {
      const response = await api.post('/auth/login', params);
      const responseData = response.data;

      if (responseData.require_2fa) {
        setTempToken(responseData.temp_token);
        setLoginStep(2);
      } else {
        login(responseData.user, responseData.access_token);
        navigate('/');
      }
    } catch (err: unknown) {
      let errorMessage = "Login failed.";
      if (err instanceof AxiosError) {
        if (err.response?.status === 429) errorMessage = "Too many login attempts.";
        else if (err.response?.status === 401) errorMessage = "Incorrect username or password.";
        else if (err.response?.status === 403) errorMessage = "Account is not active. Please verify your email.";
      }
      loginForm.setError("root", { message: errorMessage });
    }
  };

  // handler verfiy otp
  const onOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError("");
    setIsLoginLoading(true);

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
      setIsLoginLoading(false);
    }
  };

  // handle request reset link 2fa
  const onResetSubmit = async (data: ResetFormValues) => {
    try {
      await api.post('/auth/2fa/request-reset', { email: data.email });
      
      setIsResetOpen(false);
      resetForm.reset();
      
      setDialogMessage("Request received. If the email you entered is registered, we have sent a 2FA reset link. Please check your inbox or spam folder.");
      setShowSuccessDialog(true);
      
      setLoginStep(1);
      setOtp("");
      
    } catch (error) {
      resetForm.setError("root", { message: "Failed to send request. Please try again later." });
    }
  };

  // useEffect handle url params
  React.useEffect(() => {
    const status = searchParams.get('status');
    if (status === 'reset_success') {
      setDialogMessage("2FA Successfully Disabled! Please log back in with your password only.");
      setShowSuccessDialog(true);
      setSearchParams({});
    } else if (status === 'invalid_token') {
      setDialogMessage("The reset link is invalid or has expired.");
      setShowSuccessDialog(true);
      setSearchParams({});
    } else if (status === 'email_verified') {
      setDialogMessage("Email successfully verified! Your account is now active. Please log in.");
      setShowSuccessDialog(true);
    }
    else if (status === 'already_active') {
      setDialogMessage("This account is already active. Please log in.");
      setShowSuccessDialog(true);
    }

    if (status) {
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

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
        
        {/* form login */}
        {loginStep === 1 && (
          <Form {...loginForm}>
            <form onSubmit={loginForm.handleSubmit(onCredentialsSubmit)} className="space-y-6">
              
              {loginForm.formState.errors.root && (
                <Alert variant='destructive'>
                  <InfoIcon className="h-4 w-4" />
                  <AlertTitle>{loginForm.formState.errors.root.message}</AlertTitle>
                </Alert>
              )}

              <FormField
                control={loginForm.control}
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
                control={loginForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <div className='flex items-center justify-between'>
                      <FormLabel>Password</FormLabel>
                      <Link to="/forgot-password" className="text-xs text-blue-600 hover:underline">
                        Forgot Password?
                      </Link>
                    </div>
                    <FormControl><Input type="password" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <Button type="submit" className='w-full' disabled={loginForm.formState.isSubmitting}>
                {loginForm.formState.isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Login"
                )}
              </Button>
            </form>
          </Form>
        )}

        {/* verify OTP input */}
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

            <Button type="submit" className='w-full' disabled={isLoginLoading || otp.length < 6}>
              {isLoginLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Verify Code"
              )}
            </Button>

            <div className="text-center mt-4">
              <button 
                type="button"
                onClick={() => setIsResetOpen(true)}
                className="text-xs text-blue-600 hover:underline"
              >
                Reset Authenticator?
              </button>
            </div>
            
            <Button 
              type="button" variant="ghost" className="w-full mt-2" 
              onClick={() => { setLoginStep(1); setOtp(""); }}
            >
              Back to Login
            </Button>
          </form>
        )}
      </CardContent>

      {/* modal and form reset 2fa */}
      <Dialog open={isResetOpen} onOpenChange={setIsResetOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Reset 2FA Authentication</DialogTitle>
            <DialogDescription>
              Enter the email address registered to this account. We'll send you a link to disable 2FA.
            </DialogDescription>
          </DialogHeader>
            
          <Form {...resetForm}>
            <form onSubmit={resetForm.handleSubmit(onResetSubmit)} className="space-y-4">
              
              {resetForm.formState.errors.root && (
                <Alert variant="destructive">
                <AlertTitle>{resetForm.formState.errors.root.message}</AlertTitle>
                </Alert>
              )}

              <FormField
                control={resetForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Akun</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter className="mt-4">
                <Button 
                  type="button" 
                  variant="secondary" 
                  onClick={() => setIsResetOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={resetForm.formState.isSubmitting}>
                  {resetForm.formState.isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Send Reset Link"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>

        </DialogContent>
      </Dialog>
      
      <AlertDialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Information</AlertDialogTitle>
            <AlertDialogDescription>{dialogMessage}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowSuccessDialog(false)}>
              Ready, Got It
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </Card>
  );
};

export default Login;