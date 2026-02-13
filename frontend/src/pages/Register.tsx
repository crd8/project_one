import { useNavigate, Link } from 'react-router-dom';
import { get, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { AxiosError } from 'axios';
import api from '../services/api';
import zxcvbn from 'zxcvbn';

import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardAction, CardContent } from "../components/ui/card";
import { Alert, AlertTitle } from '../components/ui/alert';
import { InfoIcon, Loader2 } from 'lucide-react';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../components/ui/form";
import { toast } from "sonner";
import { Progress } from '../components/ui/progress';

const formSchema = z.object({
  username: z.string().min(3, {
    message: "Username must be at least 3 characters.",
  }),
  email: z.email({
    message: "Invalid email format.",
  }),
  fullname: z.string().min(1, {
    message: "Fullname is required.",
  }),
  password: z.string().min(8, {
    message: "Password must be at least 8 characters.",
  }),
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
  message: "Password and password confirmation do not match.",
  path: ["confirmPassword"],
}).refine(data => zxcvbn(data.password).score >= 2, {
  message: "Password is too weak. Please add numbers, symbols, or mix case.",
  path: ["password"],
});

type FormValues = z.infer<typeof formSchema>;

interface FieldError {
  field: "username" | "email";
  message: string;
}

const Register: React.FC = () => {
  const navigate = useNavigate();
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      email: "",
      fullname: "",
      password: "",
      confirmPassword: "",
    },
    mode: "onChange",
  });

  const passwordValue = form.watch("password");

  const getStrengthStats = (pass: string) => {
    if (!pass) return { score: 0, label: "", color: "bg-neutral-200" };

    const result = zxcvbn(pass);
    const score = result.score;

    switch (score) {
      case 0: return { score, label: "Very Weak", color: "bg-red-500" };
      case 1: return { score, label: "Weak", color: "bg-orange-500" };
      case 2: return { score, label: "Fair", color: "bg-yellow-500" };
      case 3: return { score, label: "Good", color: "bg-blue-500" };
      case 4: return { score, label: "Strong", color: "bg-green-500" };
      default: return { score: 0, label: "", color: "bg-neutral-200" };
    }
  }

  const strength = getStrengthStats(passwordValue);

  const onSubmit = async (data: FormValues) => {
    try {
      await api.post('/users/', { 
        username: data.username,
        email: data.email,
        password: data.password,
        fullname: data.fullname,
      });
      
      toast.success("Registration Successful!", {
        description: "Please check your email inbox to verify your account before logging in."
      });
      navigate('/login');

    } catch (err: unknown) {
      if (err instanceof AxiosError) {
        console.error("Registration attempt failed (AxiosError):", err.response?.data || err.message);

        if (err.response && err.response.status === 400) {
          const errorData = err.response.data;

          if (Array.isArray(errorData.detail)) {
            errorData.detail.forEach((fieldError: any) => {
              form.setError(fieldError.field, { message: fieldError.message });
            });
          } else if (errorData.errors && Array.isArray(errorData.errors)) {
            errorData.errors.forEach((fieldError: FieldError) => {
              form.setError(fieldError.field, { message: fieldError.message });
            });
          } else {
            const errorMessage = typeof errorData.detail === 'string' 
              ? errorData.detail 
              : 'Registration failed. Please try again.';
            form.setError("root", { message: errorMessage });
          }
        } else {
          form.setError("root", { message: 'Registration failed. Please try again later.' });
        }
      } else if (err instanceof Error) {
        console.error("Registration attempt failed (Error):", err.message);
        form.setError("root", { message: 'An unexpected error occurred.' });
      } else {
        console.error("Registration attempt failed (Unknown):", err);
        form.setError("root", { message: 'An unknown error occurred.' });
      }
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
        <Form {...form}> 
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            
            {form.formState.errors.root && (
              <Alert variant='destructive'>
                <InfoIcon />
                <AlertTitle>{form.formState.errors.root.message}</AlertTitle>
              </Alert>
            )}

            <div className="grid grid-cols-1 gap-4">
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
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="fullname"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fullname</FormLabel>
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
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    {passwordValue && (
                      <div className="space-y-1 mt-2">
                        <div className="flex h-1.5 w-full bg-neutral-200 rounded-full overflow-hidden gap-1">
                          <div className={`h-full flex-1 transition-all ${strength.score >= 0 ? strength.color : 'bg-transparent'}`}></div>
                          <div className={`h-full flex-1 transition-all ${strength.score >= 2 ? strength.color : 'bg-neutral-200'}`}></div>
                          <div className={`h-full flex-1 transition-all ${strength.score >= 3 ? strength.color : 'bg-neutral-200'}`}></div>
                          <div className={`h-full flex-1 transition-all ${strength.score >= 4 ? strength.color : 'bg-neutral-200'}`}></div>
                        </div>
                        <p className={`text-xs font-medium text-right ${strength.color.replace('bg-', 'text-')}`}>
                          Strength: {strength.label}
                        </p>
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <Button 
              type="submit" 
              className='w-full mt-6'
              disabled={form.formState.isSubmitting} 
            >
              {form.formState.isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing Registration...
                </>
              ) : (
                "Register"
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default Register;