import React, { useState } from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "./ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { toast } from "sonner";
import { Loader2, User, Mail, CheckCircle2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";

const nameSchema = z.object({
  fullname: z.string().min(1, "Fullname is required"),
});

const emailSchema = z.object({
  new_email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password required"),
});

interface EditProfileProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const EditProfile: React.FC<EditProfileProps> = ({ isOpen, onOpenChange }) => {
  const { user, login, getAccessToken } = useAuth();
  
  const [showEmailSuccess, setShowEmailSuccess] = useState(false);

  const formName = useForm<z.infer<typeof nameSchema>>({
    resolver: zodResolver(nameSchema),
    defaultValues: { fullname: user?.fullname || "" },
  });

  const formEmail = useForm<z.infer<typeof emailSchema>>({
    resolver: zodResolver(emailSchema),
    defaultValues: { new_email: "", password: "" },
  });

  React.useEffect(() => {
    if (isOpen && user) {
        formName.reset({ fullname: user.fullname });
        formEmail.reset({ new_email: user.email, password: "" });
    }
  }, [isOpen, user]);

  const onNameSubmit = async (values: z.infer<typeof nameSchema>) => {
    try {
        const { data } = await api.put('/users/me/profile', values);
        
        toast.success("Full name has been successfully updated.");

        if (user) login({ ...user, fullname: data.fullname }, getAccessToken() || "");
        onOpenChange(false);
    } catch (error) {
        toast.error("Failed to update name.");
    }
  };

  const onEmailSubmit = async (values: z.infer<typeof emailSchema>) => {
    try {
        await api.put('/users/me/email', values);
        
        onOpenChange(false);
        
        setShowEmailSuccess(true);

    } catch (error: any) {
        const msg = error.response?.data?.detail || "Gagal update email.";
        formEmail.setError("root", { message: msg });
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>Manage your basic account information.</DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="general"><User className="w-4 h-4 mr-2"/> General</TabsTrigger>
              <TabsTrigger value="email"><Mail className="w-4 h-4 mr-2"/> Email</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="py-4">
              <Form {...formName}>
                  <form onSubmit={formName.handleSubmit(onNameSubmit)} className="space-y-4">
                      <FormField
                          control={formName.control}
                          name="fullname"
                          render={({ field }) => (
                              <FormItem>
                                  <FormLabel>Fullname</FormLabel>
                                  <FormControl><Input {...field} /></FormControl>
                                  <FormMessage />
                              </FormItem>
                          )}
                      />
                      <div className="flex justify-end">
                          <Button type="submit" disabled={formName.formState.isSubmitting}>
                              {formName.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                              Save
                          </Button>
                      </div>
                  </form>
              </Form>
            </TabsContent>

            <TabsContent value="email" className="py-4">
              <Form {...formEmail}>
                  <form onSubmit={formEmail.handleSubmit(onEmailSubmit)} className="space-y-4">
                      
                      {formEmail.formState.errors.root && (
                          <div className="text-red-500 text-sm bg-red-50 p-2 rounded">{formEmail.formState.errors.root.message}</div>
                      )}

                      <FormField
                          control={formEmail.control}
                          name="new_email"
                          render={({ field }) => (
                              <FormItem>
                                  <FormLabel>New Email</FormLabel>
                                  <FormControl><Input {...field} /></FormControl>
                                  <FormMessage />
                              </FormItem>
                          )}
                      />

                      <FormField
                          control={formEmail.control}
                          name="password"
                          render={({ field }) => (
                              <FormItem>
                                  <FormLabel>Current Password</FormLabel>
                                  <FormControl><Input type="password" {...field} /></FormControl>
                                  <FormMessage />
                              </FormItem>
                          )}
                      />

                      <div className="flex justify-end">
                          <Button type="submit" variant="secondary" disabled={formEmail.formState.isSubmitting}>
                              {formEmail.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                              Send Verification
                          </Button>
                      </div>
                  </form>
              </Form>
            </TabsContent>
          </Tabs>

        </DialogContent>
      </Dialog>

      <AlertDialog open={showEmailSuccess} onOpenChange={setShowEmailSuccess}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-2">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
                <AlertDialogTitle>Verification sent!</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="pt-2">
              We have sent a verification link to your new email address.
              <br/><br/>
              <strong>Important:</strong> Your account email <u>has not been changed</u> until you click the verification link. Please check your inbox (and spam folder).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowEmailSuccess(false)}>
              Ready, I'll check now.
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default EditProfile;