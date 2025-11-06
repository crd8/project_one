import React from 'react';
import { useAuth } from '../context/AuthContext';

const Profile: React.FC = () => {
  const { user } = useAuth();

  
  if (!user) {
    return <p>Loading data profil...</p>;
  }

  return (
    <div>
      <h2>Profil Pengguna</h2>
      <p><strong>ID:</strong> {user.id}</p>
      <p><strong>Username:</strong> {user.username}</p>
      <p><strong>Email:</strong> {user.email}</p>
      <p><strong>Nama Lengkap:</strong> {user.fullname || '-'}</p>
      <p><strong>Status:</strong> {user.is_active ? 'Aktif' : 'Tidak Aktif'}</p>
      <p><strong>Admin:</strong> {user.is_superuser ? 'Ya' : 'Bukan'}</p>
      <p><strong>Bergabung:</strong> {new Date(user.created_at).toLocaleDateString('id-ID')}</p>
    </div>
  );
};

export default Profile;