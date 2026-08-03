import { Link } from 'react-router-dom';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { StatusBadge } from './StatusBadge';
import { format } from 'date-fns';
import { ChevronRight } from 'lucide-react';

interface Submission {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  service_type: string;
  message: string | null;
  status: string;
  created_at: string;
}

interface SubmissionsTableProps {
  submissions: Submission[];
}

export const SubmissionsTable = ({ submissions }: SubmissionsTableProps) => {
  if (submissions.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No submissions found
      </div>
    );
  }

  return (
    <>
      {/* Mobile Card View */}
      <div className="block md:hidden space-y-3">
        {submissions.map((submission) => (
          <Link
            key={submission.id}
            to={`/admin/submissions/${submission.id}`}
            className="block bg-card border rounded-lg p-4 hover:bg-muted/50 transition-colors touch-target"
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="font-medium text-foreground">
                {submission.first_name} {submission.last_name}
              </div>
              <StatusBadge status={submission.status || 'new'} />
            </div>
            <div className="text-sm text-muted-foreground mb-1 truncate">
              {submission.email}
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {submission.service_type}
              </span>
              <span className="text-muted-foreground">
                {format(new Date(submission.created_at), 'MMM d, yyyy')}
              </span>
            </div>
          </Link>
        ))}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block rounded-md border overflow-x-auto scroll-touch">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="hidden lg:table-cell">Email</TableHead>
              <TableHead>Service</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {submissions.map((submission) => (
              <TableRow key={submission.id} className="cursor-pointer hover:bg-muted/50">
                <TableCell>
                  <Link 
                    to={`/admin/submissions/${submission.id}`}
                    className="font-medium text-foreground hover:underline"
                  >
                    {submission.first_name} {submission.last_name}
                  </Link>
                </TableCell>
                <TableCell className="hidden lg:table-cell text-muted-foreground">
                  {submission.email}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {submission.service_type}
                </TableCell>
                <TableCell>
                  <StatusBadge status={submission.status || 'new'} />
                </TableCell>
                <TableCell className="text-muted-foreground whitespace-nowrap">
                  {format(new Date(submission.created_at), 'MMM d, yyyy')}
                </TableCell>
                <TableCell>
                  <Link to={`/admin/submissions/${submission.id}`}>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
};