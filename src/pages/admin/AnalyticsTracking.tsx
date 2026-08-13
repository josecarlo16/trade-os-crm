import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useTrackingSettings, getTrackingSetting } from '@/hooks/useTrackingSettings';
import { useQueryClient } from '@tanstack/react-query';
import { BarChart3, ExternalLink, CheckCircle, XCircle, Loader2, MessageCircle } from 'lucide-react';

const AnalyticsTracking = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useTrackingSettings();
  
  const [metaPixelId, setMetaPixelId] = useState('');
  const [metaEnabled, setMetaEnabled] = useState(false);
  const [gaId, setGaId] = useState('');
  const [gaEnabled, setGaEnabled] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      const meta = getTrackingSetting(settings, 'meta_pixel_id');
      const ga = getTrackingSetting(settings, 'ga_measurement_id');
      if (meta) {
        setMetaPixelId(meta.setting_value || '');
        setMetaEnabled(meta.is_enabled);
      }
      if (ga) {
        setGaId(ga.setting_value || '');
        setGaEnabled(ga.is_enabled);
      }
    }
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Update Meta Pixel
      const { error: metaError } = await supabase
        .from('tracking_settings')
        .update({ 
          setting_value: metaPixelId, 
          is_enabled: metaEnabled 
        })
        .eq('setting_key', 'meta_pixel_id');

      if (metaError) throw metaError;

      // Update Google Analytics
      const { error: gaError } = await supabase
        .from('tracking_settings')
        .update({ 
          setting_value: gaId, 
          is_enabled: gaEnabled 
        })
        .eq('setting_key', 'ga_measurement_id');

      if (gaError) throw gaError;

      await queryClient.invalidateQueries({ queryKey: ['tracking-settings'] });

      toast({
        title: 'Settings saved',
        description: 'Your tracking settings have been updated successfully.',
      });
    } catch (error) {
      console.error('Error saving tracking settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save tracking settings. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <AdminLayout title="Analytics Tracking">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Analytics Tracking">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="h-8 w-8" />
            Analytics Tracking
          </h1>
          <p className="text-muted-foreground mt-2">
            Configure Meta Pixel and Google Analytics tracking for your website.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Meta Pixel Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    Meta Pixel
                    {metaEnabled && metaPixelId ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-muted-foreground" />
                    )}
                  </CardTitle>
                  <CardDescription>
                    Track conversions and build audiences for Meta ads
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="meta-pixel-id">Pixel ID</Label>
                <Input
                  id="meta-pixel-id"
                  placeholder="Enter your Meta Pixel ID"
                  value={metaPixelId}
                  onChange={(e) => setMetaPixelId(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Find your Pixel ID in Meta Events Manager
                </p>
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="meta-enabled">Enable Tracking</Label>
                <Switch
                  id="meta-enabled"
                  checked={metaEnabled}
                  onCheckedChange={setMetaEnabled}
                />
              </div>

              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => window.open('https://www.facebook.com/events_manager2/list/pixel/', '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open Meta Events Manager
              </Button>
            </CardContent>
          </Card>

          {/* Google Analytics Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    Google Analytics
                    {gaEnabled && gaId ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-muted-foreground" />
                    )}
                  </CardTitle>
                  <CardDescription>
                    Analyze website traffic and user behavior
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ga-id">Measurement ID</Label>
                <Input
                  id="ga-id"
                  placeholder="G-XXXXXXXXXX"
                  value={gaId}
                  onChange={(e) => setGaId(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Find your Measurement ID in Google Analytics Admin
                </p>
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="ga-enabled">Enable Tracking</Label>
                <Switch
                  id="ga-enabled"
                  checked={gaEnabled}
                  onCheckedChange={setGaEnabled}
                />
              </div>

              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => window.open('https://analytics.google.com/', '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open Google Analytics
              </Button>
            </CardContent>
          </Card>

        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Settings'
            )}
          </Button>
        </div>

        {/* Testing Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Testing Your Tracking</CardTitle>
            <CardDescription>
              Verify that your tracking codes are working correctly
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <h4 className="font-medium">Meta Pixel</h4>
                <p className="text-sm text-muted-foreground">
                  Install the Meta Pixel Helper Chrome extension to verify your pixel is firing correctly.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open('https://chrome.google.com/webstore/detail/meta-pixel-helper/fdgfkebogiimcoedlicjlajpkdmockpc', '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Get Pixel Helper
                </Button>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">Google Analytics</h4>
                <p className="text-sm text-muted-foreground">
                  Use the Realtime reports in Google Analytics to see live data from your website.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open('https://analytics.google.com/', '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Realtime Reports
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AnalyticsTracking;
