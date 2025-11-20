import React, { useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import TwoFactorSetup from './TwoFactorSetup';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './ui/card';
import { Button } from './ui/button';
import { ShieldCheck, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';

const ProfileDataRow: React.FC<{ label: string; value: string | number | boolean }> = ({ label, value }) => (
  <div className="flex justify-between border-b py-2 text-sm">
    <dt className="text-neutral-500">{label}</dt>
    <dd className="font-medium text-neutral-900">{value.toString()}</dd>
  </div>
);

const Profile: React.FC = () => {
  const { user, login, getAccessToken } = useAuth();
  const [is2FAModalOpen, setIs2FAModalOpen] = useState(false);

  const handleDisable2FA = async () => {
    if (!confirm("Are you sure you want to turn off 2FA protection?")) return;

    try {
      await api.post('/auth/2fa/disable');
      toast.success("2FA has been disabled.");

      if (user) {
        login({ ...user, is_2fa_enabled: false }, getAccessToken() || "");
      }
    } catch (error) {
      toast.error("Failed to disable 2FA.");
    };
  };

  if (!user) {
    return <p>Loading data profil...</p>;
  }

  const joinedDate = new Date(user.created_at).toLocaleString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="max-w-md mx-auto mt-5">
      <Card>
        <CardHeader>
          <CardTitle>User Profile</CardTitle>
          <CardDescription>
            Your account details registered in the system.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="space-y-2">
            <ProfileDataRow label="ID" value={user.id} />
            <ProfileDataRow label="Username" value={user.username} />
            <ProfileDataRow label="Nama Lengkap" value={user.fullname || '-'} />
            <ProfileDataRow label="Email" value={user.email} />
            <div className="flex justify-between border-b py-2 text-sm items-center">
              <dt className="text-neutral-500">Two-Factor Auth</dt>
              <dd className="font-medium">
                {user.is_2fa_enabled ? (
                  <div className="flex items-center text-green-600 gap-1">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Active</span>
                  </div>
                ) : (
                  <div className="flex items-center text-yellow-600 gap-1">
                    <ShieldAlert className="w-4 h-4" />
                    <span>Non-active</span>
                  </div>
                )}
              </dd>
            </div>
            <ProfileDataRow label="Status" value={user.is_active ? 'Active' : 'Not active'} />
            <ProfileDataRow label="Admin" value={user.is_superuser ? 'Yes' : 'No'} />
            <ProfileDataRow label="Bergabung" value={joinedDate} />
          </dl>
        </CardContent>
        <CardFooter>
          {!user.is_2fa_enabled ? (
            <Button 
              variant="outline" 
              className="w-full border-yellow-500 text-yellow-700 hover:bg-yellow-50 hover:text-yellow-800"
              onClick={() => setIs2FAModalOpen(true)}
            >
              Enable 2FA
            </Button>
          ) : (
            <div className="flex flex-col w-full gap-2">
              <Button variant="secondary" disabled className="w-full text-green-700 bg-green-100 opacity-100 cursor-not-allowed">
                <ShieldCheck className="w-4 h-4 mr-2" />
                Protected Account
              </Button>
              
              <Button 
                variant="destructive" 
                className="w-full"
                onClick={handleDisable2FA}
              >
                Turn off 2FA
              </Button>
            </div>
          )}
        </CardFooter>
      </Card>
      <TwoFactorSetup isOpen={is2FAModalOpen} onOpenChange={setIs2FAModalOpen} />
    </div>
  );
};

export default Profile;