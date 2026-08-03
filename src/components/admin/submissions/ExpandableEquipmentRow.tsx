import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, Eye, Wrench } from "lucide-react";
import { format } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface EquipmentItem {
  id: string;
  brand: string | null;
  modelNumber: string | null;
  serialNumber: string | null;
  tonnage: string | null;
  manufacturedYear: number | null;
  equipmentType: string | null;
  refrigerant: string | null;
  seerRating: number | null;
}

interface ExpandableEquipmentRowProps {
  submission: {
    id: string;
    source: string;
    customerName: string;
    customerEmail: string;
    status: string;
    createdAt: string;
    metadata: Record<string, unknown>;
  };
  sourceColors: Record<string, string>;
  sourceLabels: Record<string, string>;
  onStatusChange: (submission: any, newStatus: string) => void;
  onViewDetails: (submission: any) => void;
}

export const ExpandableEquipmentRow = ({
  submission,
  sourceColors,
  sourceLabels,
  onStatusChange,
  onViewDetails,
}: ExpandableEquipmentRowProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const currentYear = new Date().getFullYear();
  
  const equipmentCount = (submission.metadata.equipmentCount as number) || 1;
  const allEquipment = (submission.metadata.allEquipment as EquipmentItem[]) || [];
  const hasMultipleUnits = equipmentCount > 1;

  const getAgeBadge = (manufacturedYear: number | null) => {
    if (!manufacturedYear) return null;
    const age = currentYear - manufacturedYear;
    return (
      <Badge 
        variant={age >= 15 ? "destructive" : age >= 10 ? "secondary" : "outline"}
        className="text-xs"
      >
        {age}y
      </Badge>
    );
  };

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <TableRow
        className="cursor-pointer hover:bg-muted/50"
        onClick={(e) => {
          // Don't expand if clicking on interactive elements
          const target = e.target as HTMLElement;
          if (target.closest('button') || target.closest('[role="combobox"]')) {
            return;
          }
          if (hasMultipleUnits) {
            setIsExpanded(!isExpanded);
          } else {
            onViewDetails(submission);
          }
        }}
      >
        <TableCell>
          <div className="flex items-center gap-2">
            {hasMultipleUnits && (
              <CollapsibleTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-6 w-6 p-0">
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
            )}
            <Badge className={sourceColors[submission.source]} variant="secondary">
              {sourceLabels[submission.source]}
            </Badge>
          </div>
        </TableCell>
        <TableCell className="font-medium">
          <div className="flex items-center gap-2">
            {submission.customerName}
            {hasMultipleUnits && (
              <Badge variant="outline" className="text-xs">
                {equipmentCount} units
              </Badge>
            )}
          </div>
        </TableCell>
        <TableCell className="hidden lg:table-cell text-muted-foreground">
          {submission.customerEmail}
        </TableCell>
        <TableCell>
          <Select
            value={submission.status}
            onValueChange={(value) => onStatusChange(submission, value)}
          >
            <SelectTrigger
              className="w-[120px] h-8"
              onClick={(e) => e.stopPropagation()}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="contacted">Contacted</SelectItem>
              <SelectItem value="reviewed">Reviewed</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="converted">Converted</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
              <SelectItem value="junk">Junk</SelectItem>
            </SelectContent>
          </Select>
        </TableCell>
        <TableCell className="text-muted-foreground whitespace-nowrap">
          {format(new Date(submission.createdAt), "MMM d, yyyy")}
        </TableCell>
        <TableCell>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8"
            onClick={(e) => {
              e.stopPropagation();
              onViewDetails(submission);
            }}
          >
            <Eye className="h-4 w-4" />
          </Button>
        </TableCell>
      </TableRow>
      
      {/* Expanded Equipment Details */}
      {hasMultipleUnits && (
        <CollapsibleContent asChild>
          <TableRow className="bg-muted/30 hover:bg-muted/30">
            <TableCell colSpan={6} className="p-0">
              <div className="px-4 py-3 border-l-4 border-orange-400 ml-4">
                <div className="flex items-center gap-2 mb-3 text-sm font-medium text-muted-foreground">
                  <Wrench className="h-4 w-4" />
                  Equipment Summary
                </div>
                <div className="grid gap-2">
                  {allEquipment.map((equip, idx) => (
                    <div
                      key={equip.id || idx}
                      className="flex items-center justify-between gap-4 bg-background rounded-md p-3 border"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded font-mono">
                          #{idx + 1}
                        </span>
                        <div className="flex flex-col">
                          <span className="font-medium text-sm">
                            {equip.brand || 'Unknown'} {equip.equipmentType || 'HVAC'}
                          </span>
                          <span className="text-xs text-muted-foreground font-mono">
                            {equip.modelNumber || 'No model'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 text-sm">
                        {equip.tonnage && (
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground">Tonnage:</span>
                            <span className="font-medium">{equip.tonnage}</span>
                          </div>
                        )}
                        {equip.refrigerant && (
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground">Ref:</span>
                            <span className="font-medium">{equip.refrigerant}</span>
                          </div>
                        )}
                        {equip.seerRating && (
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground">SEER:</span>
                            <span className="font-medium">{equip.seerRating}</span>
                          </div>
                        )}
                        {equip.manufacturedYear && (
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground">Year:</span>
                            <span className="font-medium">{equip.manufacturedYear}</span>
                            {getAgeBadge(equip.manufacturedYear)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </TableCell>
          </TableRow>
        </CollapsibleContent>
      )}
    </Collapsible>
  );
};
