import React, { useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog";
import { toast } from "sonner";
import { Loader2, CheckCircle2 } from "lucide-react";

interface TwoFactorSetupProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const TwoFactorSetup: React.FC<TwoFactorSetupProps> = ({ isOpen, onOpenChange }) => {
  const { user, login, getAccessToken } = useAuth();
  const [step, setStep] = useState<1 | 2>(1);
  const [qrCode, setQrCode] = useState<string>("");
  const [secret, setSecret] = useState<string>("");
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const startSetup = async () => {
    setIsLoading(true);
    try {
      const res = await api.post('/auth/2fa/setup');
      setQrCode(res.data.qr_code);
      setSecret(res.data.secret);
      setStep(2);
    } catch (error) {
      toast.error("Gagal memulai setup 2FA.");
    } finally {
      setIsLoading(false);
    }
  };

  const confirmSetup = async () => {
    if (otp.length !== 6) {
      toast.error("The code must be 6 digits.");
      return;
    }
    setIsLoading(true);
    try {
      await api.post('/auth/2fa/enable', { code: otp });
      
      toast.success("2FA Successfully Enabled!", {
        icon: <CheckCircle2 className="h-5 w-5 text-green-500" />
      });
      
      if (user) {
        login({ ...user, is_2fa_enabled: true }, getAccessToken());
      }
      
      onOpenChange(false);
      setStep(1);
      setOtp("");
    } catch (error) {
        toast.error("Verification code is incorrect or expired.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Setup Google Authenticator</DialogTitle>
          <DialogDescription>
            Secure your account with two-step verification.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center justify-center space-y-4 py-4">
          {step === 1 && (
            <div className="text-center">
              <p className="mb-4 text-sm text-muted-foreground">
                Click the button below to create a QR Code.
              </p>
              <Button onClick={startSetup} disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Generate QR Code
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="w-full space-y-4 text-center">
              <div className="flex justify-center rounded-lg border p-4 bg-white">
                <img 
                  src={`data:image/png;base64,${qrCode}`} 
                  alt="QR Code" 
                  className="h-48 w-48 object-contain"
                />
              </div>
              
              <div className="text-xs bg-slate-100 p-2 rounded font-mono break-all">
                Secret: {secret}
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Enter the 6-digit code from the app:</p>
                <Input
                  className="text-center text-lg tracking-[0.5em] font-mono"
                  placeholder="000000"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                />
              </div>
            </div>
          )}
        </div>

        {step === 2 && (
          <DialogFooter>
            <Button onClick={confirmSetup} disabled={isLoading || otp.length < 6} className="w-full">
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Verify & Activate
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default TwoFactorSetup;