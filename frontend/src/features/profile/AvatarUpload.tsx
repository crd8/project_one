import React, { useRef, useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import { toast } from "sonner";

const AvatarUpload: React.FC = () => {
  const { user, login, getAccessToken } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isUploading, setIsUploading] = useState(false);
  const [imageStatus, setImageStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  
  const [avatarTimestamp, setAvatarTimestamp] = useState(Date.now());

  useEffect(() => {
    setImageStatus('loading');
  }, [user?.profile_image, avatarTimestamp]);

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
      
      setAvatarTimestamp(Date.now());

      login({ ...user, profile_image: data.profile_image }, getAccessToken() || "");
        
    } catch (error) {
      toast.error("Gagal mengupload foto.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const triggerFileInput = () => {
    if (!isUploading) {
        fileInputRef.current?.click();
    }
  };

  const avatarUrl = user.profile_image 
    ? `http://localhost:8000${user.profile_image}?t=${avatarTimestamp}` 
    : undefined;

  return (
    <div className="flex flex-col items-center gap-4 mb-6">
      <div className="relative group">
        <Avatar 
            className="w-24 h-24 border-4 border-white shadow-xl cursor-pointer bg-neutral-100 transition-transform hover:scale-105" 
            onClick={triggerFileInput}
        >
          {user.profile_image && (
            <AvatarImage 
                src={avatarUrl} 
                className={`object-cover transition-opacity duration-500 ${imageStatus === 'loaded' ? 'opacity-100' : 'opacity-0'}`}
                onLoadingStatusChange={(status) => {
                    setImageStatus(status);
                }}
            />
          )}

          <AvatarFallback className="bg-neutral-100 flex items-center justify-center overflow-hidden">
            {user.profile_image && imageStatus === 'loading' && (
                <div className="absolute inset-0 bg-neutral-200 animate-pulse w-full h-full" />
            )}

            {isUploading && (
               <div className="absolute inset-0 bg-black/10 flex items-center justify-center z-20">
                   <Loader2 className="w-8 h-8 text-neutral-600 animate-spin" />
               </div>
            )}

            {!isUploading && (
                <span className={`text-2xl font-bold text-neutral-600 ${imageStatus === 'loading' && user.profile_image ? 'opacity-0' : 'opacity-100'}`}>
                    {getInitials(user.fullname || user.username)}
                </span>
            )}
          </AvatarFallback>
        </Avatar>
        
        {!isUploading && (
            <div 
            className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 cursor-pointer backdrop-blur-[1px]"
            onClick={triggerFileInput}
            >
            <Camera className="w-7 h-7 text-white drop-shadow-md" />
            </div>
        )}

        {isUploading && (
            <div className="absolute bottom-0 right-0 bg-white rounded-full p-1 shadow-md border border-neutral-200">
                <Loader2 className="w-4 h-4 text-primary animate-spin" />
            </div>
        )}
      </div>

      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept="image/png, image/jpeg, image/webp"
        onChange={handleFileChange}
      />
        
      <div className="text-center space-y-1">
        <h3 className="font-bold text-xl text-neutral-800 tracking-tight">
            {user.fullname}
        </h3>
        <p className="text-sm font-medium text-neutral-500 bg-neutral-100 px-3 py-1 rounded-full inline-block">
            @{user.username}
        </p>
      </div>
    </div>
  );
};

export default AvatarUpload;