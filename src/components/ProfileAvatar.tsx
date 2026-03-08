import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Camera } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ProfileAvatarProps {
  size?: 'sm' | 'md' | 'lg';
  editable?: boolean;
}

export function ProfileAvatar({ size = 'md', editable = false }: ProfileAvatarProps) {
  const { session } = useAuth();
  const { toast } = useToast();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const sizeClass = size === 'sm' ? 'h-7 w-7' : size === 'lg' ? 'h-16 w-16' : 'h-9 w-9';
  const iconSize = size === 'sm' ? 10 : size === 'lg' ? 18 : 14;

  useEffect(() => {
    if (!session?.user?.id) return;
    supabase
      .from('profiles')
      .select('avatar_url')
      .eq('id', session.user.id)
      .single()
      .then(({ data }) => {
        if (data?.avatar_url) setAvatarUrl(data.avatar_url);
      });
  }, [session?.user?.id]);

  const initials = session?.user?.email
    ? session.user.email.slice(0, 2).toUpperCase()
    : '?';

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !session?.user?.id) return;

    if (file.size > 2 * 1024 * 1024) {
      toast({ title: 'Te groot', description: 'Maximaal 2MB', variant: 'destructive' });
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${session.user.id}/avatar.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true });
      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      const { error: updateErr } = await supabase
        .from('profiles')
        .upsert({ id: session.user.id, avatar_url: publicUrl, updated_at: new Date().toISOString() });
      if (updateErr) throw updateErr;

      setAvatarUrl(publicUrl);
      toast({ title: '✅ Profielfoto bijgewerkt!' });
    } catch (err: any) {
      toast({ title: 'Fout', description: err.message, variant: 'destructive' });
    }
    setUploading(false);
  }

  return (
    <div className="relative group">
      <Avatar className={`${sizeClass} border-2 border-border/50`}>
        {avatarUrl ? (
          <AvatarImage src={avatarUrl} alt="Profielfoto" />
        ) : null}
        <AvatarFallback className="text-xs font-bold bg-primary/20 text-primary">
          {initials}
        </AvatarFallback>
      </Avatar>

      {editable && (
        <>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
          >
            {uploading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />
            ) : (
              <Camera size={iconSize} className="text-white" />
            )}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleUpload}
          />
        </>
      )}
    </div>
  );
}
