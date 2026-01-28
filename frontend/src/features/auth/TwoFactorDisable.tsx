import React, { useState } from 'react';
import api from '@/services/api';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface TwoFactorDisableProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const TwoFactorDisable: React.FC<TwoFactorDisableProps> = ({ isOpen, onOpenChange, onSuccess }) => {
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleDisable = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await api.post('/auth/2fa/disable', { password: password });

      toast.success("2FA Successfully Disabled.");
      
      onSuccess();
      
      setPassword("");
      onOpenChange(false);
    } catch (error: any) {
      const msg = error.response?.data?.detail || "Failed to Turn off 2FA";
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Confirm Security</DialogTitle>
          <DialogDescription>
            Enter your password to disable 2FA. This action will lower your account security.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleDisable}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="confirm-password">Current password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button 
              type="button" 
              variant="secondary" 
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="destructive" 
              disabled={isLoading || !password}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Turn off 2FA
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default TwoFactorDisable;