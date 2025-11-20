import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './ui/card';
import { Button } from './ui/button';
import { ShieldCheck, ShieldAlert } from 'lucide-react';

import TwoFactorSetup from './TwoFactorSetup';
import TwoFactorDisable from './TwoFactorDisable';

const ProfileDataRow: React.FC<{ label: string; value: string | number | boolean }> = ({ label, value }) => (
  <div className="flex justify-between border-b py-2 text-sm">
    <dt className="text-neutral-500">{label}</dt>
    <dd className="font-medium text-neutral-900">{value.toString()}</dd>
  </div>
);

const Profile: React.FC = () => {
  const { user, login, getAccessToken } = useAuth();
  const [is2FAModalOpen, setIs2FAModalOpen] = useState(false);
  const [isDisableOpen, setIsDisableOpen] = useState(false);

  if (!user) return <p>Loading profile data...</p>;

  const joinedDate = new Date(user.created_at).toLocaleString('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric'
  });

  const handleDisableSuccess = () => {
    if (user) {
      login({ ...user, is_2fa_enabled: false }, getAccessToken() || "");
    }
  };

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
            <ProfileDataRow label="Fullname" value={user.fullname || '-'} />
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
                    <span>Not activated</span>
                  </div>
                )}
              </dd>
            </div>
            <ProfileDataRow label="Status" value={user.is_active ? 'Active' : 'Not active'} />
            <ProfileDataRow label="Administrator" value={user.is_superuser ? 'Yes' : 'No'} />
            <ProfileDataRow label="Created at" value={joinedDate} />
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
                Two-Step Verification Active
              </Button>
              
              <Button 
                variant="destructive" 
                className="w-full"
                onClick={() => setIsDisableOpen(true)}
              >
                Turn off 2FA
              </Button>
            </div>
          )}
        </CardFooter>
      </Card>
      <TwoFactorSetup
        isOpen={is2FAModalOpen}
        onOpenChange={setIs2FAModalOpen}
      />
      <TwoFactorDisable 
        isOpen={isDisableOpen}
        onOpenChange={setIsDisableOpen}
        onSuccess={handleDisableSuccess}
      />
    </div>
  );
};

export default Profile;