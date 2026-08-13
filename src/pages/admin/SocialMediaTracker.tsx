import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import { Loader2, ExternalLink, Facebook, Instagram, Linkedin, MapPin, Home, Save, BarChart3, MousePointerClick } from 'lucide-react';
import { format, subDays } from 'date-fns';

interface SocialLink {
  id: string;
  platform: string;
  url: string | null;
  display_name: string;
  icon_name: string | null;
  is_active: boolean;
}

interface ClickStats {
  platform: string;
  total_clicks: number;
  footer_clicks: number;
  testimonials_clicks: number;
  last_7_days: number;
  last_30_days: number;
}

const platformIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  facebook: Facebook,
  instagram: Instagram,
  linkedin: Linkedin,
  google_maps: MapPin,
  houzz: Home,
};

// Custom Yelp icon component
const YelpIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.16 12.594l-4.995 1.433c-.96.276-1.74-.8-1.176-1.63l2.905-4.308a1.072 1.072 0 0 1 1.596-.206 9.194 9.194 0 0 1 1.813 3.03c.32.9-.143 1.68-1.143 1.68zM13.397 14.6l4.732 2.073c.913.4 1.06 1.533.387 2.213a9.24 9.24 0 0 1-2.885 1.673c-.88.34-1.66-.12-1.86-.96l-1.2-4.84c-.24-.96.826-1.76 1.826-1.16zM11.693 8.62V3.6c0-1 .76-1.47 1.62-1.073a9.22 9.22 0 0 1 2.88 2.3c.56.7.4 1.6-.36 2.12l-3.54 2.36c-.8.54-1.6.12-1.6-.687zM10.24 13.167l-2.4 4.533c-.48.91-1.593.953-2.2.12a9.22 9.22 0 0 1-1.26-3.16c-.2-.9.3-1.6 1.2-1.73l4.5-.6c.96-.13 1.48.927 1.16 1.837zM9.293 10.873l-4.88-.667c-.96-.133-1.38-.987-1.027-1.853a9.24 9.24 0 0 1 1.967-2.9c.64-.62 1.54-.54 2.08.18l3.113 3.78c.6.727.067 1.64-.853 1.46z"/>
  </svg>
);

const SocialMediaTracker = () => {
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const [clickStats, setClickStats] = useState<ClickStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const { isAdmin, loading: roleLoading } = useUserRole();

  useEffect(() => {
    fetchSocialLinks();
    fetchClickStats();
  }, []);

  const fetchSocialLinks = async () => {
    try {
      const { data, error } = await supabase
        .from('social_links')
        .select('*')
        .order('display_name');

      if (error) throw error;
      setSocialLinks(data || []);
    } catch (error) {
      console.error('Error fetching social links:', error);
      toast({
        title: 'Error',
        description: 'Failed to load social links',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchClickStats = async () => {
    try {
      const now = new Date();
      const sevenDaysAgo = subDays(now, 7);
      const thirtyDaysAgo = subDays(now, 30);

      // Get all clicks
      const { data: allClicks, error } = await supabase
        .from('social_link_clicks')
        .select('platform, source, clicked_at');

      if (error) throw error;

      // Calculate stats per platform
      const platforms = ['facebook', 'instagram', 'linkedin', 'yelp', 'google_maps', 'houzz'];
      const stats: ClickStats[] = platforms.map(platform => {
        const platformClicks = allClicks?.filter(c => c.platform === platform) || [];
        return {
          platform,
          total_clicks: platformClicks.length,
          footer_clicks: platformClicks.filter(c => c.source === 'footer').length,
          testimonials_clicks: platformClicks.filter(c => c.source === 'testimonials').length,
          last_7_days: platformClicks.filter(c => new Date(c.clicked_at) >= sevenDaysAgo).length,
          last_30_days: platformClicks.filter(c => new Date(c.clicked_at) >= thirtyDaysAgo).length,
        };
      });

      setClickStats(stats);
    } catch (error) {
      console.error('Error fetching click stats:', error);
    }
  };

  const handleUrlChange = (id: string, url: string) => {
    setSocialLinks(prev =>
      prev.map(link => (link.id === id ? { ...link, url } : link))
    );
  };

  const handleActiveChange = (id: string, is_active: boolean) => {
    setSocialLinks(prev =>
      prev.map(link => (link.id === id ? { ...link, is_active } : link))
    );
  };

  const saveAllChanges = async () => {
    setSaving(true);
    try {
      for (const link of socialLinks) {
        const { error } = await supabase
          .from('social_links')
          .update({ url: link.url, is_active: link.is_active })
          .eq('id', link.id);

        if (error) throw error;
      }

      toast({
        title: 'Success',
        description: 'Social media links updated successfully',
      });
    } catch (error) {
      console.error('Error saving social links:', error);
      toast({
        title: 'Error',
        description: 'Failed to save changes',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const getIcon = (platform: string) => {
    if (platform === 'yelp') {
      return YelpIcon;
    }
    return platformIcons[platform] || MapPin;
  };

  const getStatsForPlatform = (platform: string): ClickStats => {
    return clickStats.find(s => s.platform === platform) || {
      platform,
      total_clicks: 0,
      footer_clicks: 0,
      testimonials_clicks: 0,
      last_7_days: 0,
      last_30_days: 0,
    };
  };

  const totalClicks = clickStats.reduce((sum, s) => sum + s.total_clicks, 0);
  const totalLast7Days = clickStats.reduce((sum, s) => sum + s.last_7_days, 0);
  const totalLast30Days = clickStats.reduce((sum, s) => sum + s.last_30_days, 0);

  if (roleLoading || loading) {
    return (
      <AdminLayout title="Social Media Tracker">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-[#1e3a5f]" />
        </div>
      </AdminLayout>
    );
  }

  if (!isAdmin) {
    return (
      <AdminLayout title="Social Media Tracker">
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">
              Access denied. Only administrators can manage social media links.
            </p>
          </CardContent>
        </Card>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Social Media Tracker">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#1e3a5f]">Social Media Tracker</h1>
            <p className="text-muted-foreground">
              Manage your social media links and view engagement analytics
            </p>
          </div>
          <Button onClick={saveAllChanges} disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save All Changes
          </Button>
        </div>

        {/* Analytics Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-full">
                  <MousePointerClick className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Clicks</p>
                  <p className="text-2xl font-bold">{totalClicks}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 rounded-full">
                  <BarChart3 className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Last 7 Days</p>
                  <p className="text-2xl font-bold">{totalLast7Days}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-100 rounded-full">
                  <BarChart3 className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Last 30 Days</p>
                  <p className="text-2xl font-bold">{totalLast30Days}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Social Media Platforms</CardTitle>
            <CardDescription>
              Update URLs and toggle visibility for each platform. Click analytics show engagement from footer and testimonials sections.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {socialLinks.map(link => {
                const IconComponent = getIcon(link.platform);
                const stats = getStatsForPlatform(link.platform);
                return (
                  <div
                    key={link.id}
                    className="p-4 border rounded-lg bg-muted/30"
                  >
                    <div className="flex items-center gap-4 mb-3">
                      <div className="flex items-center gap-3 w-40">
                        <IconComponent className="h-6 w-6 text-[#1e3a5f]" />
                        <span className="font-medium">{link.display_name}</span>
                      </div>

                      <div className="flex-1">
                        <Input
                          value={link.url || ''}
                          onChange={e => handleUrlChange(link.id, e.target.value)}
                          placeholder={`Enter ${link.display_name} URL`}
                          className="w-full"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <Switch
                          id={`active-${link.id}`}
                          checked={link.is_active}
                          onCheckedChange={checked => handleActiveChange(link.id, checked)}
                        />
                        <Label htmlFor={`active-${link.id}`} className="text-sm w-14">
                          {link.is_active ? 'Active' : 'Hidden'}
                        </Label>
                      </div>

                      {link.url && (
                        <Button
                          variant="ghost"
                          size="icon"
                          asChild
                        >
                          <a href={link.url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                    </div>

                    {/* Click Stats Row */}
                    <div className="flex items-center gap-6 ml-[172px] text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <MousePointerClick className="h-3.5 w-3.5" />
                        <span>{stats.total_clicks} total</span>
                      </div>
                      <div>Footer: {stats.footer_clicks}</div>
                      <div>Testimonials: {stats.testimonials_clicks}</div>
                      <div className="text-green-600">7d: {stats.last_7_days}</div>
                      <div className="text-purple-600">30d: {stats.last_30_days}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default SocialMediaTracker;
