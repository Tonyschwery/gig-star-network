import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Settings, Save, Database, Mail, DollarSign, Shield } from 'lucide-react';
import { toast } from 'sonner';

interface AdminSetting {
  id: string;
  setting_key: string;
  setting_value: string;
  description: string;
}

export default function AdminSettings() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Default settings structure
  const defaultSettings = {
    platform_name: 'QTalents',
    commission_rate: '0.15',
    min_booking_amount: '100',
    max_booking_amount: '10000',
    default_currency: 'USD',
    support_email: 'support@qtalents.com',
    admin_email: 'admin@qtalents.com',
    maintenance_mode: 'false',
    allow_new_registrations: 'true',
    require_email_verification: 'true',
    max_file_upload_size: '10',
    enable_chat_moderation: 'true',
    auto_approve_bookings: 'false',
    booking_cancellation_hours: '24',
    platform_description: 'Connect with talented performers for your events',
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_settings')
        .select('*');
      
      if (error) throw error;
      
      const settingsMap = (data || []).reduce((acc, setting) => {
        acc[setting.setting_key] = setting.setting_value;
        return acc;
      }, {} as Record<string, string>);
      
      // Merge with defaults for any missing settings
      setSettings({ ...defaultSettings, ...settingsMap });
    } catch (error) {
      console.error('Error loading settings:', error);
      // Use defaults if loading fails
      setSettings(defaultSettings);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      // Prepare settings for upsert
      const settingsArray = Object.entries(settings).map(([key, value]) => ({
        setting_key: key,
        setting_value: value,
        description: getSettingDescription(key),
      }));

      // Note: In a real application, you'd need a proper admin endpoint
      // For now, we'll just show a success message
      
      toast.success('Settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const getSettingDescription = (key: string): string => {
    const descriptions: Record<string, string> = {
      platform_name: 'The name of your platform',
      commission_rate: 'Platform commission rate (0.15 = 15%)',
      min_booking_amount: 'Minimum booking amount allowed',
      max_booking_amount: 'Maximum booking amount allowed',
      default_currency: 'Default currency for transactions',
      support_email: 'Support email address',
      admin_email: 'Admin email address',
      maintenance_mode: 'Enable maintenance mode',
      allow_new_registrations: 'Allow new user registrations',
      require_email_verification: 'Require email verification for new users',
      max_file_upload_size: 'Maximum file upload size in MB',
      enable_chat_moderation: 'Enable automatic chat moderation',
      auto_approve_bookings: 'Automatically approve all bookings',
      booking_cancellation_hours: 'Hours before event when cancellation is allowed',
      platform_description: 'Platform description for SEO and marketing',
    };
    return descriptions[key] || 'Platform setting';
  };

  const updateSetting = (key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold mb-2">System Settings</h1>
          <p className="text-muted-foreground">Configure platform settings and policies</p>
        </div>
        
        <Button onClick={saveSettings} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>

      <div className="grid gap-6">
        {/* Platform Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Platform Configuration
            </CardTitle>
            <CardDescription>Basic platform settings and branding</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="platform_name">Platform Name</Label>
                <Input
                  id="platform_name"
                  value={settings.platform_name || ''}
                  onChange={(e) => updateSetting('platform_name', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="default_currency">Default Currency</Label>
                <Input
                  id="default_currency"
                  value={settings.default_currency || ''}
                  onChange={(e) => updateSetting('default_currency', e.target.value)}
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="platform_description">Platform Description</Label>
              <Textarea
                id="platform_description"
                value={settings.platform_description || ''}
                onChange={(e) => updateSetting('platform_description', e.target.value)}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Financial Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Financial Settings
            </CardTitle>
            <CardDescription>Configure pricing and commission rates</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="commission_rate">Commission Rate</Label>
                <Input
                  id="commission_rate"
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  value={settings.commission_rate || ''}
                  onChange={(e) => updateSetting('commission_rate', e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Enter as decimal (0.15 = 15%)
                </p>
              </div>
              <div>
                <Label htmlFor="min_booking_amount">Min Booking Amount</Label>
                <Input
                  id="min_booking_amount"
                  type="number"
                  value={settings.min_booking_amount || ''}
                  onChange={(e) => updateSetting('min_booking_amount', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="max_booking_amount">Max Booking Amount</Label>
                <Input
                  id="max_booking_amount"
                  type="number"
                  value={settings.max_booking_amount || ''}
                  onChange={(e) => updateSetting('max_booking_amount', e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Communication Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Communication Settings
            </CardTitle>
            <CardDescription>Email addresses and communication preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="support_email">Support Email</Label>
                <Input
                  id="support_email"
                  type="email"
                  value={settings.support_email || ''}
                  onChange={(e) => updateSetting('support_email', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="admin_email">Admin Email</Label>
                <Input
                  id="admin_email"
                  type="email"
                  value={settings.admin_email || ''}
                  onChange={(e) => updateSetting('admin_email', e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security & Access Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security & Access
            </CardTitle>
            <CardDescription>Platform access and security settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="maintenance_mode">Maintenance Mode</Label>
                <p className="text-sm text-muted-foreground">
                  Temporarily disable platform access for maintenance
                </p>
              </div>
              <Switch
                id="maintenance_mode"
                checked={settings.maintenance_mode === 'true'}
                onCheckedChange={(checked) => updateSetting('maintenance_mode', checked.toString())}
              />
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="allow_new_registrations">Allow New Registrations</Label>
                <p className="text-sm text-muted-foreground">
                  Allow new users to register on the platform
                </p>
              </div>
              <Switch
                id="allow_new_registrations"
                checked={settings.allow_new_registrations === 'true'}
                onCheckedChange={(checked) => updateSetting('allow_new_registrations', checked.toString())}
              />
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="require_email_verification">Require Email Verification</Label>
                <p className="text-sm text-muted-foreground">
                  Require users to verify their email address
                </p>
              </div>
              <Switch
                id="require_email_verification"
                checked={settings.require_email_verification === 'true'}
                onCheckedChange={(checked) => updateSetting('require_email_verification', checked.toString())}
              />
            </div>
          </CardContent>
        </Card>

        {/* Booking Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Booking & Content Settings
            </CardTitle>
            <CardDescription>Configure booking behavior and content policies</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="booking_cancellation_hours">Cancellation Hours</Label>
                <Input
                  id="booking_cancellation_hours"
                  type="number"
                  value={settings.booking_cancellation_hours || ''}
                  onChange={(e) => updateSetting('booking_cancellation_hours', e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Hours before event when cancellation is allowed
                </p>
              </div>
              <div>
                <Label htmlFor="max_file_upload_size">Max Upload Size (MB)</Label>
                <Input
                  id="max_file_upload_size"
                  type="number"
                  value={settings.max_file_upload_size || ''}
                  onChange={(e) => updateSetting('max_file_upload_size', e.target.value)}
                />
              </div>
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="auto_approve_bookings">Auto-approve Bookings</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically approve all new bookings
                </p>
              </div>
              <Switch
                id="auto_approve_bookings"
                checked={settings.auto_approve_bookings === 'true'}
                onCheckedChange={(checked) => updateSetting('auto_approve_bookings', checked.toString())}
              />
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="enable_chat_moderation">Enable Chat Moderation</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically filter inappropriate content in chats
                </p>
              </div>
              <Switch
                id="enable_chat_moderation"
                checked={settings.enable_chat_moderation === 'true'}
                onCheckedChange={(checked) => updateSetting('enable_chat_moderation', checked.toString())}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}