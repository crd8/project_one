import React, { useState } from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "./ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "./ui/dialog";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const profileSchema = z.object({
  fullname: z.string().min(1, "Fullname is required"),
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password diperlukan untuk konfirmasi"),
});

interface EditProfileProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const EditProfile: React.FC<EditProfileProps> = ({ isOpen, onOpenChange }) => {
  const { user, login, getAccessToken } = useAuth();
  
  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    values: { 
      fullname: user?.fullname || "",
      email: user?.email || "",
      password: "",
    },
  });

  React.useEffect(() => {
    if (isOpen && user) {
      form.reset({
        fullname: user.fullname || "",
        email: user.email,
        password: ""
      });
    }
  }, [isOpen, user, form]);

  const onSubmit = async (values: z.infer<typeof profileSchema>) => {
    try {
      const { data } = await api.put('/users/me', values);
      
      if (values.email !== user?.email) {
        toast.success("Profile Updated.", {
          description: "We've sent a verification link to your new email. Your email will remain the same until it's verified."
        });
      } else {
          toast.success("Profile Updated!");
      }
      
      if (user) {
        login({ ...user, ...data, email: user.email }, getAccessToken() || ""); 
      }
      
      onOpenChange(false);
    } catch (error: any) {
      const msg = error.response?.data?.detail || "Failed to update profile.";
      form.setError("root", { message: msg });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>Update your personal information.</DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            
            {form.formState.errors.root && (
               <div className="text-red-500 text-sm">{form.formState.errors.root.message}</div>
            )}

            <FormField
              control={form.control}
              name="fullname"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fullname</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
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
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="pt-2 border-t mt-4">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                  <FormLabel className="text-red-600">Konfirmasi Password</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
               <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
               <Button type="submit" disabled={form.formState.isSubmitting}>
                 {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                 Save Changes
               </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default EditProfile;