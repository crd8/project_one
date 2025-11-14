// frontend/src/components/Login.tsx

import React from 'react';
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
import { InfoIcon } from 'lucide-react';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./ui/form";

const formSchema = z.object({
  username: z.string().min(1, { message: "Username tidak boleh kosong." }),
  password: z.string().min(1, { message: "Password tidak boleh kosong." }),
});

type FormValues = z.infer<typeof formSchema>;

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const onSubmit = async (data: FormValues) => {
    const params = new URLSearchParams();
    params.append('username', data.username);
    params.append('password', data.password);

    try {
      const { data: loginResponse } = await api.post('/token', params);
      login(loginResponse.user, loginResponse.access_token);
      navigate('/');
    } catch (err: unknown) {
      let errorMessage = "Failed to log in. An unexpected error occurred."

      if (err instanceof AxiosError) {
        console.error("Login attempt failed (AxiosError):", err.response?.data || err.message);

        if (err.response?.status === 429) {
          errorMessage = "Too many login attempts. Please try again later.";
        } else if (err.response?.status === 401) {
          errorMessage = "Login failed. Incorrect username or password.";
        }
      } else if (err instanceof Error) {
        console.error("Login attempt failed (Error):", err.message);
        errorMessage = err.message;
      } else {
        console.error("Login attempt failed (Unknown error):", err);
      }

      form.setError("root", { 
        message: errorMessage
      });
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
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
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
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <div className='flex items-center'>
                    <FormLabel>Password</FormLabel>
                    <a
                      href="#"
                      className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                    >
                      Forgot your password?
                    </a>
                  </div>
                  <FormControl>
                    <Input type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Button 
              type="submit" 
              className='w-full'
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? "Loading..." : "Login"}
            </Button>
            
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default Login;