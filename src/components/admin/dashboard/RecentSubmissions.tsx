import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '../submissions/StatusBadge';
import { format } from 'date-fns';
import { ArrowRight } from 'lucide-react';

interface Submission {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  service_type: string;
  status: string;
  created_at: string;
}

interface RecentSubmissionsProps {
  submissions: Submission[];
}

export const RecentSubmissions = ({ submissions }: RecentSubmissionsProps) => {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Recent Submissions</CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/admin/submissions" className="flex items-center gap-1">
            View All
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {submissions.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            No submissions yet
          </p>
        ) : (
          <div className="space-y-4">
            {submissions.map((submission) => (
              <Link
                key={submission.id}
                to={`/admin/submissions/${submission.id}`}
                className="block p-4 rounded-lg border hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">
                      {submission.first_name} {submission.last_name}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">
                      {submission.email}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {submission.service_type}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <StatusBadge status={submission.status || 'new'} />
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(submission.created_at), 'MMM d, h:mm a')}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
