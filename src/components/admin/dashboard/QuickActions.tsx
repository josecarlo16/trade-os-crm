import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  PenSquare, 
  ExternalLink, 
  Images, 
  FileText, 
  Settings 
} from 'lucide-react';

const actions = [
  { label: 'New Blog Post', href: '/admin/blog', icon: PenSquare },
  { label: 'View Live Site', href: 'https://truficient.lovable.app', icon: ExternalLink, external: true },
  { label: 'Add Media', href: '/admin/gallery', icon: Images },
  { label: 'Submissions', href: '/admin/submissions', icon: FileText },
  { label: 'Settings', href: '/admin/settings', icon: Settings },
];

export const QuickActions = () => {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {actions.map((action) => (
            action.external ? (
              <a
                key={action.label}
                href={action.href}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline" size="sm" className="gap-2">
                  <action.icon className="h-4 w-4" />
                  {action.label}
                </Button>
              </a>
            ) : (
              <Link key={action.label} to={action.href}>
                <Button variant="outline" size="sm" className="gap-2">
                  <action.icon className="h-4 w-4" />
                  {action.label}
                </Button>
              </Link>
            )
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
