import React, { useRef, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { Camera, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { toast } from "sonner";

const AvatarUpload: React.FC = () => {
  const { user, login, getAccessToken } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  if (!user) return null;

  const getInitials = (name: string) => {
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
        toast.error("File terlalu besar. Maksimal 2MB.");
        return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const { data } = await api.post('/users/me/avatar', formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
        
      toast.success("Foto profil berhasil diperbarui!");
        
      login({ ...user, profile_image: data.profile_image }, getAccessToken() || "");
        
    } catch (error) {
      toast.error("Gagal mengupload foto.");
    } finally {
      setIsUploading(false);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const avatarUrl = user.profile_image 
    ? `http://localhost:8000${user.profile_image}?t=${new Date().getTime()}`
    : undefined;

  return (
    <div className="flex flex-col items-center gap-4 mb-6">
      <div className="relative group">
        <Avatar className="w-24 h-24 border-2 border-white shadow-lg cursor-pointer" onClick={triggerFileInput}>
          <AvatarImage src={avatarUrl} className="object-cover" />
          <AvatarFallback className="text-2xl bg-neutral-200 text-neutral-600 font-bold">
            {getInitials(user.fullname || user.username)}
          </AvatarFallback>
        </Avatar>
        
        <div 
          className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
          onClick={triggerFileInput}
        >
          {isUploading ? <Loader2 className="w-6 h-6 text-white animate-spin"/> : <Camera className="w-6 h-6 text-white" />}
        </div>
      </div>

      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept="image/png, image/jpeg, image/webp"
        onChange={handleFileChange}
      />
        
      <div className="text-center">
        <h3 className="font-semibold text-lg">{user.fullname}</h3>
        <p className="text-sm text-neutral-500">@{user.username}</p>
      </div>
    </div>
  );
};

export default AvatarUpload;