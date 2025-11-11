import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card';

const ProfileDataRow: React.FC<{ label: string; value: string | number | boolean }> = ({ label, value }) => (
  <div className="flex justify-between border-b py-2 text-sm">
    <dt className="text-neutral-500">{label}</dt>
    <dd className="font-medium text-neutral-900">{value.toString()}</dd>
  </div>
);

const Profile: React.FC = () => {
  const { user } = useAuth();

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
          <CardTitle>Profil Pengguna</CardTitle>
          <CardDescription>
            Detail akun Anda yang terdaftar di sistem.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="space-y-2">
            <ProfileDataRow label="ID" value={user.id} />
            <ProfileDataRow label="Username" value={user.username} />
            <ProfileDataRow label="Nama Lengkap" value={user.fullname || '-'} />
            <ProfileDataRow label="Email" value={user.email} />
            <ProfileDataRow label="Status" value={user.is_active ? 'Aktif' : 'Tidak Aktif'} />
            <ProfileDataRow label="Admin" value={user.is_superuser ? 'Ya' : 'Bukan'} />
            <ProfileDataRow label="Bergabung" value={joinedDate} />
          </dl>
        </CardContent>
      </Card>
    </div>
  );
};

export default Profile;