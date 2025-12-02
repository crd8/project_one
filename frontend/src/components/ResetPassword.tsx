import React, { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import api from '../services/api';
import zxcvbn from 'zxcvbn';

import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "./ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "./ui/form";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const resetSchema = z.object({
  password: z.string().min(8, { message: "Password must be at least 8 characters." }),
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"],
}).refine(data => zxcvbn(data.password).score >= 2, {
  message: "Password is too weak.",
  path: ["password"],
});

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const form = useForm<z.infer<typeof resetSchema>>({
    resolver: zodResolver(resetSchema),
    defaultValues: { password: "", confirmPassword: "" },
    mode: "onChange"
  });

  const passwordValue = form.watch("password");

  const getStrengthStats = (pass: string) => {
    if (!pass) return { score: 0, label: "", color: "bg-neutral-200" };
    const score = zxcvbn(pass).score;
    switch (score) {
      case 0: return { score, label: "Very Weak", color: "bg-red-500" };
      case 1: return { score, label: "Weak", color: "bg-orange-500" };
      case 2: return { score, label: "Fair", color: "bg-yellow-500" };
      case 3: return { score, label: "Good", color: "bg-blue-500" };
      case 4: return { score, label: "Strong", color: "bg-green-500" };
      default: return { score: 0, label: "", color: "bg-neutral-200" };
    }
  };
  const strength = getStrengthStats(passwordValue);

  const onSubmit = async (values: z.infer<typeof resetSchema>) => {
    if (!token) {
      toast.error("Invalid token.");
      return;
    }

    try {
      await api.post('/auth/password-reset/confirm', {
        token: token,
        new_password: values.password
      });

      toast.success("Password Updated!", {
        description: "You can now login with your new password."
      });
      navigate('/login');

    } catch (error: any) {
      const msg = error.response?.data?.detail || "Failed to reset password. Token might be expired.";
      toast.error(msg);
    }
  };

  if (!token) {
    return <div className="text-center mt-10 text-red-500">Error: Missing Reset Token.</div>;
  }

  return (
    <div className="flex items-center justify-center min-h-[80vh] px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Set New Password</CardTitle>
          <CardDescription>Create a strong password for your account.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
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

              <Button type="submit" className="w-full mt-2" disabled={form.formState.isSubmitting}>
                 {form.formState.isSubmitting ? "Updating..." : "Reset Password"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;