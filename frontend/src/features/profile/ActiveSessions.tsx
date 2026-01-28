import React, { useEffect, useState } from 'react';
import api from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Laptop, Smartphone, Globe, Loader2, LogOut } from 'lucide-react';
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';

interface Session {
  id: string;
  user_agent: string;
  ip_address: string;
  created_at: string;
  is_current: boolean;
}

const ActiveSessions: React.FC = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [revokeId, setRevokeId] = useState<string | null>(null);
  const [isRevoking, setIsRevoking] = useState(false);

  const fetchSessions = async () => {
    try {
      const { data } = await api.get('/auth/sessions');
      const sorted = data.sort((a: Session, b: Session) => {
        if (a.is_current) return -1;
        if (b.is_current) return 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
      setSessions(sorted);
    } catch (error) {
      console.error("Failed to fetch sessions");
    } finally {
      setIsLoading(false);
    }
  };

  const initiateRevoke = (id: string) => {
    setRevokeId(id);
  }

  const confirmRevoke = async () => {
    if (!revokeId) return;

    setIsRevoking(true);
    try {
      await api.delete(`/auth/sessions/${revokeId}`);
      toast.success("Device logged out successfully");
      setSessions((prev) => prev.filter(s => s.id !== revokeId));
    } catch (error) {
      toast.error("Failed to revoke session");
      fetchSessions();
    } finally {
      setIsRevoking(false);
      setRevokeId(null);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const parseUA = (ua: string) => {
    if (!ua) return { os: 'Unknown', browser: 'Unknown', icon: <Globe className="w-5 h-5"/> };
    
    let icon = <Laptop className="w-5 h-5 text-gray-500"/>;
    if (ua.toLowerCase().includes('mobile')) icon = <Smartphone className="w-5 h-5 text-gray-500"/>;

    let os = "Unknown OS";
    if (ua.includes("Windows")) os = "Windows";
    else if (ua.includes("Mac")) os = "MacOS";
    else if (ua.includes("Linux")) os = "Linux";
    else if (ua.includes("Android")) os = "Android";
    else if (ua.includes("iOS")) os = "iOS";

    let browser = "Browser";
    if (ua.includes("Chrome")) browser = "Chrome";
    else if (ua.includes("Firefox")) browser = "Firefox";
    else if (ua.includes("Safari") && !ua.includes("Chrome")) browser = "Safari";
    else if (ua.includes("Edg")) browser = "Edge";

    return { os, browser, icon };
  };

  if (isLoading) return <div className="text-center p-4">Loading sessions...</div>;

  return (
    <>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Active Sessions</CardTitle>
          <CardDescription>Manage devices that are currently logged into your account.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {sessions.map((session) => {
              const { os, browser, icon } = parseUA(session.user_agent);
              const date = new Date(session.created_at).toLocaleString('id-ID', {
                day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
              });

              return (
                <div key={session.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-neutral-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-neutral-100 rounded-full">
                      {icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{os} • {browser}</p>
                        {session.is_current && <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 hover:bg-green-100">This Device</Badge>}
                      </div>
                      <p className="text-xs text-neutral-500">
                        {session.ip_address} • Logged in {date}
                      </p>
                    </div>
                  </div>
                  
                  {!session.is_current && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => initiateRevoke(session.id)}
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Log Out
                    </Button>
                  )}
                </div>
              );
            })}
            {sessions.length === 0 && (
              <div className="text-center py-6 text-neutral-500 text-sm">
                There are no other active sessions.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      <AlertDialog open={!!revokeId} onOpenChange={(open) => !open && setRevokeId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Device?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will log your account out of that device. They will need to log back in to access their account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRevoking}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault();
                confirmRevoke();
              }}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
              disabled={isRevoking}
            >
              {isRevoking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Yes, Take it out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ActiveSessions;