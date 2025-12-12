import React from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import api from '../services/api';
import zxcvbn from 'zxcvbn';

import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "./ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "./ui/dialog";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const passwordSchema = z.object({
  current_password: z.string().min(1, "Current password is required"),
  new_password: z.string().min(8, "Min 8 characters"),
  confirm_password: z.string()
}).refine(data => data.new_password === data.confirm_password, {
    message: "Passwords do not match", path: ["confirm_password"]
}).refine(data => zxcvbn(data.new_password).score >= 2, {
    message: "New password is too weak", path: ["new_password"]
});

interface ChangePasswordProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const ChangePassword: React.FC<ChangePasswordProps> = ({ isOpen, onOpenChange }) => {
  const form = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { current_password: "", new_password: "", confirm_password: "" },
    mode: "onChange"
  });

  const newPasswordValue = form.watch("new_password");

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
  const strength = getStrengthStats(newPasswordValue);

  const onSubmit = async (values: z.infer<typeof passwordSchema>) => {
    try {
      await api.post('/users/me/password', {
        current_password: values.current_password,
        new_password: values.new_password
      });
      
      toast.success("Password Changed Successfully!");
      form.reset();
      onOpenChange(false);
    } catch (error: any) {
      const msg = error.response?.data?.detail || "Failed to change password.";
      form.setError("root", { message: msg });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Change Password</DialogTitle>
          <DialogDescription>Ensure your account uses a long and random password to stay secure.</DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            
            {form.formState.errors.root && (
               <div className="text-red-500 text-sm font-medium">{form.formState.errors.root.message}</div>
            )}

            <FormField
              control={form.control}
              name="current_password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Current Password</FormLabel>
                  <FormControl><Input type="password" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="new_password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Password</FormLabel>
                  <FormControl><Input type="password" {...field} /></FormControl>
                  
                  {newPasswordValue && (
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
              name="confirm_password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm New Password</FormLabel>
                  <FormControl><Input type="password" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
               <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
               <Button type="submit" disabled={form.formState.isSubmitting}>
                 {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                 Update Password
               </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default ChangePassword;