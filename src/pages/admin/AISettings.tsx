import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Loader2, 
  Bot, 
  Sparkles, 
  Settings2, 
  BarChart3,
  Save,
  RefreshCw,
  Shield,
  CheckCircle,
  XCircle,
  Zap
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUserRole } from '@/hooks/useUserRole';
import { format } from 'date-fns';

interface AIConfig {
  id: string;
  config_key: string;
  provider: string;
  model: string;
  api_key_secret_name: string | null;
  temperature: number;
  max_tokens: number;
  system_prompt: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface AIRequestLog {
  id: string;
  config_key: string;
  provider: string;
  model: string;
  action: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  duration_ms: number | null;
  status: string;
  error_message: string | null;
  created_at: string;
}

const PROVIDERS = [
  { 
    value: 'lovable', 
    label: 'Lovable AI (Built-in)',
    description: 'No API key required',
    requiresKey: false
  },
  { 
    value: 'openai', 
    label: 'OpenAI',
    description: 'GPT-4o, GPT-4 Turbo, GPT-3.5',
    requiresKey: true
  },
  { 
    value: 'anthropic', 
    label: 'Anthropic',
    description: 'Claude 3.5, Claude 3 Opus/Haiku',
    requiresKey: true
  },
  { 
    value: 'xai', 
    label: 'xAI',
    description: 'Grok-4, Grok-3, Vision & Code Models',
    requiresKey: true
  },
  { 
    value: 'google', 
    label: 'Google AI',
    description: 'Gemini Pro, Gemini Flash',
    requiresKey: true
  },
];

const MODELS_BY_PROVIDER: Record<string, { value: string; label: string }[]> = {
  lovable: [
    { value: 'google/gemini-2.5-flash', label: 'Gemini 2.5 Flash (Fast)' },
    { value: 'google/gemini-2.5-pro', label: 'Gemini 2.5 Pro (Powerful)' },
    { value: 'google/gemini-3-flash-preview', label: 'Gemini 3 Flash Preview' },
    { value: 'google/gemini-3-pro-preview', label: 'Gemini 3 Pro Preview' },
    { value: 'openai/gpt-5', label: 'GPT-5 (Powerful)' },
    { value: 'openai/gpt-5-mini', label: 'GPT-5 Mini (Balanced)' },
    { value: 'openai/gpt-5-nano', label: 'GPT-5 Nano (Fast)' },
    { value: 'openai/gpt-5.2', label: 'GPT-5.2 (Latest)' },
  ],
  openai: [
    { value: 'gpt-4o', label: 'GPT-4o' },
    { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
    { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
  ],
  anthropic: [
    { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet' },
    { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus' },
    { value: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku' },
  ],
  xai: [
    // Recommended (Top 3)
    { value: 'grok-4-1-fast-reasoning', label: 'Grok 4.1 Fast Reasoning (Recommended)' },
    { value: 'grok-3-mini', label: 'Grok 3 Mini (Cost-Effective)' },
    { value: 'grok-code-fast-1', label: 'Grok Code Fast (Structured Data)' },
    // Additional Grok 4 Options
    { value: 'grok-4-1-fast-non-reasoning', label: 'Grok 4.1 Fast' },
    { value: 'grok-4-fast-reasoning', label: 'Grok 4 Reasoning' },
    // Grok 3
    { value: 'grok-3', label: 'Grok 3' },
    // Vision & Media
    { value: 'grok-2-vision-1212', label: 'Grok 2 Vision' },
    { value: 'grok-imagine-image-pro', label: 'Grok Image Pro' },
    // Legacy
    { value: 'grok-2', label: 'Grok 2 (Legacy)' },
  ],
  google: [
    { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
    { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
  ],
};

const CONFIG_KEY_LABELS: Record<string, string> = {
  ai_assistant: 'AI Assistant',
  knowledge_base: 'Knowledge Base (Translation)',
};

const KNOWN_CONFIG_KEYS = ['ai_assistant', 'knowledge_base'];

const AISettingsPage = () => {
  const [config, setConfig] = useState<AIConfig | null>(null);
  const [allConfigs, setAllConfigs] = useState<AIConfig[]>([]);
  const [configKey, setConfigKey] = useState<string>('ai_assistant');
  const [logs, setLogs] = useState<AIRequestLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const { toast } = useToast();
  const { isSuperAdmin, loading: roleLoading } = useUserRole();

  // Editable state
  const [provider, setProvider] = useState('lovable');
  const [model, setModel] = useState('google/gemini-2.5-flash');
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(2048);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [isActive, setIsActive] = useState(true);

  const applyConfig = (data: AIConfig | null) => {
    setConfig(data);
    if (data) {
      setProvider(data.provider);
      setModel(data.model);
      setTemperature(Number(data.temperature) || 0.7);
      setMaxTokens(data.max_tokens || 2048);
      setSystemPrompt(data.system_prompt || '');
      setIsActive(data.is_active);
    } else {
      setProvider('lovable');
      setModel('google/gemini-2.5-flash');
      setTemperature(0.7);
      setMaxTokens(2048);
      setSystemPrompt('');
      setIsActive(true);
    }
  };

  const fetchConfig = async (key: string) => {
    try {
      const { data: list, error } = await supabase
        .from('ai_config')
        .select('*')
        .order('config_key');
      if (error) throw error;
      setAllConfigs((list || []) as any);
      const match = ((list || []) as any[]).find((c) => c.config_key === key) || null;
      applyConfig(match);
    } catch (error) {
      console.error('Error fetching AI config:', error);
    }
  };

  const fetchLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_request_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error('Error fetching AI logs:', error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchConfig(configKey), fetchLogs()]);
      setLoading(false);
    };

    if (isSuperAdmin) {
      loadData();
    } else if (!roleLoading) {
      setLoading(false);
    }
  }, [isSuperAdmin, roleLoading, configKey]);

  const saveConfig = async () => {
    setSaving(true);
    try {
      const updateData = {
        provider,
        model,
        temperature,
        max_tokens: maxTokens,
        system_prompt: systemPrompt,
        is_active: isActive,
        updated_at: new Date().toISOString(),
      };

      if (config) {
        const { error } = await supabase
          .from('ai_config')
          .update(updateData)
          .eq('id', config.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('ai_config')
          .insert({
            config_key: configKey,
            ...updateData,
          });

        if (error) throw error;
      }

      toast({
        title: 'Configuration Saved',
        description: `${CONFIG_KEY_LABELS[configKey] || configKey} settings have been updated.`,
      });

      fetchConfig(configKey);
    } catch (error: any) {
      console.error('Error saving config:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save configuration',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: {
          message: 'Say "Hello, the connection is working!" in exactly those words.',
          conversationHistory: [],
        },
      });

      if (error) throw error;

      setTestResult({
        success: true,
        message: data?.message || 'Connection successful!',
      });
    } catch (error: any) {
      console.error('Test failed:', error);
      setTestResult({
        success: false,
        message: error.message || 'Connection test failed',
      });
    } finally {
      setTesting(false);
    }
  };

  const selectedProvider = PROVIDERS.find(p => p.value === provider);
  const availableModels = MODELS_BY_PROVIDER[provider] || [];

  // Reset model when provider changes
  useEffect(() => {
    const models = MODELS_BY_PROVIDER[provider];
    if (models && models.length > 0 && !models.find(m => m.value === model)) {
      setModel(models[0].value);
    }
  }, [provider]);

  if (roleLoading || loading) {
    return (
      <AdminLayout title="AI Settings">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  if (!isSuperAdmin) {
    return (
      <AdminLayout title="AI Settings">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Shield className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Access Denied</h3>
            <p className="text-muted-foreground text-center">
              Only super administrators can manage AI settings.
            </p>
          </CardContent>
        </Card>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="AI Settings">
      <div className="space-y-6">
        {/* Header Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Bot className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Current Provider</p>
                  <p className="font-medium">{selectedProvider?.label || 'Not Set'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <Sparkles className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Current Model</p>
                  <p className="font-medium truncate max-w-[150px]">{model}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Zap className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Requests</p>
                  <p className="font-medium">{logs.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${isActive ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                  {isActive ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <p className="font-medium">{isActive ? 'Active' : 'Disabled'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="configuration" className="space-y-4">
          <TabsList>
            <TabsTrigger value="configuration" className="gap-2">
              <Settings2 className="h-4 w-4" />
              Configuration
            </TabsTrigger>
            <TabsTrigger value="logs" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Request Logs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="configuration" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Feature Configuration</CardTitle>
                <CardDescription>Select which AI feature to configure</CardDescription>
              </CardHeader>
              <CardContent>
                <Select value={configKey} onValueChange={setConfigKey}>
                  <SelectTrigger className="max-w-md">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {KNOWN_CONFIG_KEYS.map((k) => (
                      <SelectItem key={k} value={k}>
                        {CONFIG_KEY_LABELS[k] || k}
                        {!allConfigs.find((c) => c.config_key === k) && ' (not configured)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Provider & Model */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">AI Provider & Model</CardTitle>
                  <CardDescription>
                    Choose which AI service to use for the assistant
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Provider</Label>
                    <Select value={provider} onValueChange={setProvider}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PROVIDERS.map((p) => (
                          <SelectItem key={p.value} value={p.value}>
                            <div className="flex items-center gap-2">
                              <span>{p.label}</span>
                              {!p.requiresKey && (
                                <Badge variant="secondary" className="text-xs">No Key</Badge>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground">
                      {selectedProvider?.description}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Model</Label>
                    <Select value={model} onValueChange={setModel}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {availableModels.map((m) => (
                          <SelectItem key={m.value} value={m.value}>
                            {m.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedProvider?.requiresKey && (
                    <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                      <p className="text-sm text-amber-600 dark:text-amber-400">
                        This provider requires an API key. Contact your administrator to configure the secret.
                      </p>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={isActive}
                        onCheckedChange={setIsActive}
                        id="ai-active"
                      />
                      <Label htmlFor="ai-active">Enable AI Assistant</Label>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Parameters */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Model Parameters</CardTitle>
                  <CardDescription>
                    Fine-tune the AI response behavior
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Temperature</Label>
                      <span className="text-sm font-medium">{temperature.toFixed(2)}</span>
                    </div>
                    <Slider
                      value={[temperature]}
                      onValueChange={(v) => setTemperature(v[0])}
                      min={0}
                      max={2}
                      step={0.1}
                    />
                    <p className="text-xs text-muted-foreground">
                      Lower = more focused, Higher = more creative
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="maxTokens">Max Tokens</Label>
                    <Input
                      id="maxTokens"
                      type="number"
                      value={maxTokens}
                      onChange={(e) => setMaxTokens(parseInt(e.target.value) || 2048)}
                      min={256}
                      max={8192}
                    />
                    <p className="text-xs text-muted-foreground">
                      Maximum length of AI responses (256-8192)
                    </p>
                  </div>

                  {/* Test Connection */}
                  <div className="pt-4 border-t space-y-3">
                    <Button
                      variant="outline"
                      onClick={testConnection}
                      disabled={testing}
                      className="w-full"
                    >
                      {testing ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4 mr-2" />
                      )}
                      Test Connection
                    </Button>
                    {testResult && (
                      <div className={`p-3 rounded-lg ${
                        testResult.success 
                          ? 'bg-green-500/10 border border-green-500/20' 
                          : 'bg-red-500/10 border border-red-500/20'
                      }`}>
                        <p className={`text-sm ${
                          testResult.success ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {testResult.message}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* System Prompt */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">System Prompt</CardTitle>
                <CardDescription>
                  Define the AI assistant's personality and behavior
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  rows={6}
                  placeholder="You are a helpful AI assistant for the Truficient HVAC CRM..."
                />
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {systemPrompt.length} characters
                  </p>
                  <Button onClick={saveConfig} disabled={saving}>
                    {saving ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Save Configuration
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="logs">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recent AI Requests</CardTitle>
                <CardDescription>
                  Monitor AI assistant usage and performance
                </CardDescription>
              </CardHeader>
              <CardContent>
                {logs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Bot className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No AI requests yet</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Time</TableHead>
                        <TableHead>Provider</TableHead>
                        <TableHead>Model</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Tokens</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="text-sm">
                            {format(new Date(log.created_at), 'MMM d, h:mm a')}
                          </TableCell>
                          <TableCell>{log.provider}</TableCell>
                          <TableCell className="font-mono text-xs max-w-[150px] truncate">
                            {log.model}
                          </TableCell>
                          <TableCell>{log.action || '-'}</TableCell>
                          <TableCell>
                            {log.input_tokens && log.output_tokens 
                              ? `${log.input_tokens}/${log.output_tokens}`
                              : '-'
                            }
                          </TableCell>
                          <TableCell>
                            {log.duration_ms ? `${log.duration_ms}ms` : '-'}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={log.status === 'success' ? 'default' : 'destructive'}
                            >
                              {log.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AISettingsPage;
