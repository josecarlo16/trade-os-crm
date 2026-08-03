import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Pencil, User, Loader2 } from 'lucide-react';
import AuthorProfileDialog from './AuthorProfileDialog';

interface AuthorProfile {
  id: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
}

interface AuthorSelectorProps {
  selectedProfileId: string | null;
  onChange: (profile: AuthorProfile | null) => void;
}

const AuthorSelector = ({ selectedProfileId, onChange }: AuthorSelectorProps) => {
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<AuthorProfile[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<AuthorProfile | null>(null);

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('author_profiles' as any)
        .select('*')
        .order('display_name');

      if (error) throw error;
      setProfiles((data as unknown as AuthorProfile[]) || []);
    } catch (error) {
      console.error('Error fetching author profiles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSelect = (profileId: string) => {
    if (profileId === 'none') {
      onChange(null);
    } else {
      const profile = profiles.find((p) => p.id === profileId);
      onChange(profile || null);
    }
  };

  const handleCreateNew = () => {
    setEditingProfile(null);
    setDialogOpen(true);
  };

  const handleEdit = () => {
    const profile = profiles.find((p) => p.id === selectedProfileId);
    if (profile) {
      setEditingProfile(profile);
      setDialogOpen(true);
    }
  };

  const handleProfileSaved = (savedProfile: AuthorProfile) => {
    setProfiles((prev) => {
      const exists = prev.some((p) => p.id === savedProfile.id);
      if (exists) {
        return prev.map((p) => (p.id === savedProfile.id ? savedProfile : p));
      }
      return [...prev, savedProfile].sort((a, b) =>
        a.display_name.localeCompare(b.display_name)
      );
    });
    onChange(savedProfile);
  };

  const selectedProfile = profiles.find((p) => p.id === selectedProfileId);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <Select
            value={selectedProfileId || 'none'}
            onValueChange={handleProfileSelect}
            disabled={loading}
          >
            <SelectTrigger>
              {loading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Loading...</span>
                </div>
              ) : (
                <SelectValue placeholder="Select an author" />
              )}
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">
                <span className="text-muted-foreground">No author</span>
              </SelectItem>
              {profiles.map((profile) => (
                <SelectItem key={profile.id} value={profile.id}>
                  <div className="flex items-center gap-2">
                    {profile.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt=""
                        className="w-5 h-5 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center">
                        <User className="h-3 w-3 text-muted-foreground" />
                      </div>
                    )}
                    {profile.display_name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={handleCreateNew}
          title="Create new author"
        >
          <Plus className="h-4 w-4" />
        </Button>
        {selectedProfileId && selectedProfileId !== 'none' && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleEdit}
            title="Edit author"
          >
            <Pencil className="h-4 w-4" />
          </Button>
        )}
      </div>

      {selectedProfile && (
        <div className="p-3 bg-muted/30 rounded-lg border">
          <div className="flex items-start gap-3">
            {selectedProfile.avatar_url ? (
              <img
                src={selectedProfile.avatar_url}
                alt={selectedProfile.display_name}
                className="w-10 h-10 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <User className="h-5 w-5 text-primary" />
              </div>
            )}
            <div className="min-w-0">
              <p className="font-medium text-sm">{selectedProfile.display_name}</p>
              {selectedProfile.bio && (
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                  {selectedProfile.bio}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <AuthorProfileDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        profile={editingProfile}
        onSave={handleProfileSaved}
      />
    </div>
  );
};

export default AuthorSelector;
