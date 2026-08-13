import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { 
  Loader2, 
  Save, 
  ArrowLeft,
  Plus,
  Trash2,
  GripVertical
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';

interface CalculatorOption {
  id?: string;
  calculator_id?: string;
  option_name: string;
  option_type: string;
  label: string;
  help_text: string;
  options: Array<{ value: string; label: string; price_modifier: number }>;
  sort_order: number;
  is_required: boolean;
}

interface CalculatorConfig {
  id?: string;
  name: string;
  slug: string;
  description: string;
  is_active: boolean;
  calculator_type: string;
  config: {
    base_price?: number;
    currency?: string;
    disclaimer?: string;
  };
}

const CalculatorEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isNew = id === 'new';

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  
  const [calculator, setCalculator] = useState<CalculatorConfig>({
    name: '',
    slug: '',
    description: '',
    is_active: true,
    calculator_type: 'estimate',
    config: {
      base_price: 0,
      currency: 'USD',
      disclaimer: 'This is an estimate only. Final pricing may vary based on inspection.',
    },
  });

  const [options, setOptions] = useState<CalculatorOption[]>([]);

  useEffect(() => {
    if (!isNew) {
      fetchCalculator();
    }
  }, [id, isNew]);

  const fetchCalculator = async () => {
    try {
      const { data: calcData, error: calcError } = await supabase
        .from('calculator_configs')
        .select('*')
        .eq('id', id)
        .single();

      if (calcError) throw calcError;

      setCalculator({
        ...calcData,
        config: calcData.config as CalculatorConfig['config'] || {},
      });

      const { data: optionsData, error: optionsError } = await supabase
        .from('calculator_options')
        .select('*')
        .eq('calculator_id', id)
        .order('sort_order');

      if (optionsError) throw optionsError;

      setOptions(optionsData.map(opt => ({
        ...opt,
        options: opt.options as CalculatorOption['options'] || [],
      })) || []);
    } catch (error) {
      console.error('Error fetching calculator:', error);
      toast({
        title: 'Error',
        description: 'Failed to load calculator',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const handleNameChange = (name: string) => {
    setCalculator(prev => ({
      ...prev,
      name,
      slug: isNew ? generateSlug(name) : prev.slug,
    }));
  };

  const addOption = () => {
    setOptions(prev => [
      ...prev,
      {
        option_name: `option_${prev.length + 1}`,
        option_type: 'select',
        label: 'New Option',
        help_text: '',
        options: [{ value: 'option1', label: 'Option 1', price_modifier: 0 }],
        sort_order: prev.length,
        is_required: true,
      },
    ]);
  };

  const updateOption = (index: number, updates: Partial<CalculatorOption>) => {
    setOptions(prev => prev.map((opt, i) => 
      i === index ? { ...opt, ...updates } : opt
    ));
  };

  const removeOption = (index: number) => {
    setOptions(prev => prev.filter((_, i) => i !== index));
  };

  const addOptionChoice = (optionIndex: number) => {
    setOptions(prev => prev.map((opt, i) => {
      if (i === optionIndex) {
        return {
          ...opt,
          options: [
            ...opt.options,
            { value: `choice_${opt.options.length + 1}`, label: 'New Choice', price_modifier: 0 },
          ],
        };
      }
      return opt;
    }));
  };

  const updateOptionChoice = (
    optionIndex: number, 
    choiceIndex: number, 
    updates: Partial<{ value: string; label: string; price_modifier: number }>
  ) => {
    setOptions(prev => prev.map((opt, i) => {
      if (i === optionIndex) {
        return {
          ...opt,
          options: opt.options.map((choice, ci) =>
            ci === choiceIndex ? { ...choice, ...updates } : choice
          ),
        };
      }
      return opt;
    }));
  };

  const removeOptionChoice = (optionIndex: number, choiceIndex: number) => {
    setOptions(prev => prev.map((opt, i) => {
      if (i === optionIndex) {
        return {
          ...opt,
          options: opt.options.filter((_, ci) => ci !== choiceIndex),
        };
      }
      return opt;
    }));
  };

  const handleSave = async () => {
    if (!calculator.name || !calculator.slug) {
      toast({
        title: 'Validation Error',
        description: 'Name and slug are required',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);

    try {
      let calculatorId = id;

      if (isNew) {
        const { data, error } = await supabase
          .from('calculator_configs')
          .insert({
            name: calculator.name,
            slug: calculator.slug,
            description: calculator.description,
            is_active: calculator.is_active,
            calculator_type: calculator.calculator_type,
            config: calculator.config,
          })
          .select()
          .single();

        if (error) throw error;
        calculatorId = data.id;
      } else {
        const { error } = await supabase
          .from('calculator_configs')
          .update({
            name: calculator.name,
            slug: calculator.slug,
            description: calculator.description,
            is_active: calculator.is_active,
            calculator_type: calculator.calculator_type,
            config: calculator.config,
          })
          .eq('id', id);

        if (error) throw error;

        // Delete existing options
        await supabase
          .from('calculator_options')
          .delete()
          .eq('calculator_id', id);
      }

      // Insert options
      if (options.length > 0) {
        const optionsToInsert = options.map((opt, index) => ({
          calculator_id: calculatorId,
          option_name: opt.option_name,
          option_type: opt.option_type,
          label: opt.label,
          help_text: opt.help_text,
          options: opt.options,
          sort_order: index,
          is_required: opt.is_required,
        }));

        const { error: optionsError } = await supabase
          .from('calculator_options')
          .insert(optionsToInsert);

        if (optionsError) throw optionsError;
      }

      toast({
        title: 'Success',
        description: `Calculator ${isNew ? 'created' : 'updated'} successfully`,
      });

      if (isNew) {
        navigate(`/admin/calculators/${calculatorId}`);
      }
    } catch (error: any) {
      console.error('Error saving calculator:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save calculator',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout title="Calculator Editor">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-[#1e3a5f]" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title={isNew ? 'New Calculator' : 'Edit Calculator'}>
      <div className="space-y-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate('/admin/calculators')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Calculators
          </Button>
          <Button onClick={handleSave} disabled={saving} className="bg-[#1e3a5f] hover:bg-[#1e3a5f]/90">
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            {isNew ? 'Create Calculator' : 'Save Changes'}
          </Button>
        </div>

        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Configure the calculator name and settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Calculator Name</Label>
                <Input
                  id="name"
                  value={calculator.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="HVAC Service Estimate"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">URL Slug</Label>
                <Input
                  id="slug"
                  value={calculator.slug}
                  onChange={(e) => setCalculator(prev => ({ ...prev, slug: e.target.value }))}
                  placeholder="hvac-estimate"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={calculator.description}
                onChange={(e) => setCalculator(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Get an instant estimate for HVAC services"
                rows={2}
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="is_active"
                checked={calculator.is_active}
                onCheckedChange={(checked) => setCalculator(prev => ({ ...prev, is_active: checked }))}
              />
              <Label htmlFor="is_active">Active (visible to customers)</Label>
            </div>
          </CardContent>
        </Card>

        {/* Config */}
        <Card>
          <CardHeader>
            <CardTitle>Calculator Settings</CardTitle>
            <CardDescription>Configure pricing and display options</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="base_price">Base Price ($)</Label>
                <Input
                  id="base_price"
                  type="number"
                  value={calculator.config.base_price || 0}
                  onChange={(e) => setCalculator(prev => ({
                    ...prev,
                    config: { ...prev.config, base_price: Number(e.target.value) },
                  }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Input
                  id="currency"
                  value={calculator.config.currency || 'USD'}
                  onChange={(e) => setCalculator(prev => ({
                    ...prev,
                    config: { ...prev.config, currency: e.target.value },
                  }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="disclaimer">Disclaimer Text</Label>
              <Textarea
                id="disclaimer"
                value={calculator.config.disclaimer || ''}
                onChange={(e) => setCalculator(prev => ({
                  ...prev,
                  config: { ...prev.config, disclaimer: e.target.value },
                }))}
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* Options */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Calculator Options</CardTitle>
                <CardDescription>Configure the form fields and pricing modifiers</CardDescription>
              </div>
              <Button onClick={addOption} variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Option
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {options.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No options configured. Add options to create form fields.</p>
              </div>
            ) : (
              options.map((option, optionIndex) => (
                <div key={optionIndex} className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-start gap-4">
                    <GripVertical className="h-5 w-5 text-muted-foreground mt-2 cursor-grab" />
                    <div className="flex-1 space-y-4">
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>Field Name (ID)</Label>
                          <Input
                            value={option.option_name}
                            onChange={(e) => updateOption(optionIndex, { option_name: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Label</Label>
                          <Input
                            value={option.label}
                            onChange={(e) => updateOption(optionIndex, { label: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2 flex items-end gap-2">
                          <div className="flex items-center gap-2 flex-1">
                            <Switch
                              checked={option.is_required}
                              onCheckedChange={(checked) => updateOption(optionIndex, { is_required: checked })}
                            />
                            <span className="text-sm">Required</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            onClick={() => removeOption(optionIndex)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Help Text</Label>
                        <Input
                          value={option.help_text}
                          onChange={(e) => updateOption(optionIndex, { help_text: e.target.value })}
                          placeholder="Optional help text for this field"
                        />
                      </div>

                      <Separator />

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label>Choices</Label>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => addOptionChoice(optionIndex)}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Add Choice
                          </Button>
                        </div>
                        <div className="space-y-2">
                          {option.options.map((choice, choiceIndex) => (
                            <div key={choiceIndex} className="flex items-center gap-2">
                              <Input
                                value={choice.value}
                                onChange={(e) => updateOptionChoice(optionIndex, choiceIndex, { value: e.target.value })}
                                placeholder="value"
                                className="w-32"
                              />
                              <Input
                                value={choice.label}
                                onChange={(e) => updateOptionChoice(optionIndex, choiceIndex, { label: e.target.value })}
                                placeholder="Display Label"
                                className="flex-1"
                              />
                              <div className="flex items-center gap-1">
                                <span className="text-sm text-muted-foreground">$</span>
                                <Input
                                  type="number"
                                  value={choice.price_modifier}
                                  onChange={(e) => updateOptionChoice(optionIndex, choiceIndex, { price_modifier: Number(e.target.value) })}
                                  className="w-24"
                                />
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-muted-foreground hover:text-destructive"
                                onClick={() => removeOptionChoice(optionIndex, choiceIndex)}
                                disabled={option.options.length <= 1}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default CalculatorEditor;
