import { useMemo, useState } from 'react';
import * as Icons from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

const CURATED = [
  'BookOpen','Wrench','Settings','Hammer','Cog','Zap','Flame','Snowflake','Thermometer','Wind',
  'Droplet','Droplets','Fan','Plug','Power','Gauge','AlertTriangle','AlertCircle','Info','HelpCircle',
  'CheckCircle','ClipboardList','ClipboardCheck','FileText','Folder','Home','Building','Building2',
  'Factory','Truck','Calendar','Clock','Phone','Mail','MapPin','Users','User','Shield','Lock',
  'Key','Star','Heart','Bookmark','Tag','Tags','Lightbulb','Battery','Cpu','HardDrive','Database',
  'Cloud','CloudRain','Sun','Moon','Activity','BarChart','LineChart','PieChart','TrendingUp',
  'Package','Box','Boxes','Layers','Grid','List','Search','Filter','Download','Upload','Save',
  'Trash2','Pencil','Edit','Plus','Minus','X','Check','ArrowRight','PlayCircle','Video','Image',
  'Camera','Mic','Volume2','Bell','Flag','Award','Target','Compass','Map','Globe','Link','Paperclip',
  'Printer','Monitor','Smartphone','Tablet','Laptop','Server','Wifi','Bluetooth','Radio',
];

interface Props {
  value: string;
  onChange: (v: string) => void;
}

export default function IconPicker({ value, onChange }: Props) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  const Current = (value && (Icons as any)[value]) as any;

  const list = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return CURATED;
    // Search across all lucide icons when querying
    return Object.keys(Icons)
      .filter(k => /^[A-Z]/.test(k) && k.toLowerCase().includes(q) && typeof (Icons as any)[k] === 'function')
      .slice(0, 200);
  }, [query]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-start gap-2 font-normal">
          {Current ? <Current className="h-4 w-4" /> : <Search className="h-4 w-4 text-muted-foreground" />}
          <span className={value ? '' : 'text-muted-foreground'}>{value || 'Choose an icon'}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-3" align="start">
        <Input
          placeholder="Search icons..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="mb-3"
        />
        <div className="grid grid-cols-6 gap-1 max-h-64 overflow-y-auto">
          {list.map(name => {
            const Ico = (Icons as any)[name];
            if (!Ico) return null;
            const selected = value === name;
            return (
              <button
                key={name}
                type="button"
                title={name}
                onClick={() => { onChange(name); setOpen(false); }}
                className={`flex items-center justify-center h-9 w-9 rounded-md border hover:bg-accent ${selected ? 'border-primary bg-accent' : 'border-transparent'}`}
              >
                <Ico className="h-4 w-4" />
              </button>
            );
          })}
          {list.length === 0 && (
            <div className="col-span-6 text-center text-xs text-muted-foreground py-4">No icons found</div>
          )}
        </div>
        {value && (
          <Button variant="ghost" size="sm" className="w-full mt-2" onClick={() => { onChange(''); setOpen(false); }}>
            Clear
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}
