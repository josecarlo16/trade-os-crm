import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { MapPin, Thermometer, Calendar, Wrench, CheckCircle, XCircle, ExternalLink, Package } from "lucide-react";

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

interface ScannerSubmissionDetailProps {
  metadata: Record<string, unknown>;
}

export const ScannerSubmissionDetail = ({ metadata }: ScannerSubmissionDetailProps) => {
  const currentYear = new Date().getFullYear();
  const equipmentCount = (metadata.equipmentCount as number) || 1;
  const allEquipment = (metadata.allEquipment as EquipmentItem[]) || [];

  const getAgeBadge = (year: number | null) => {
    if (!year) return <Badge variant="outline">Unknown age</Badge>;
    const age = currentYear - year;
    if (age >= 20) return <Badge className="bg-red-100 text-red-800">{age} yrs</Badge>;
    if (age >= 12) return <Badge className="bg-yellow-100 text-yellow-800">{age} yrs</Badge>;
    return <Badge className="bg-green-100 text-green-800">{age} yrs</Badge>;
  };

  return (
    <div className="space-y-4">
      {/* Location Info */}
      <div>
        <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          Location
        </h4>
        <div className="bg-muted/50 rounded-lg p-3 space-y-1 text-sm">
          {(metadata.city || metadata.state) && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">City/State:</span>
              <span className="font-medium">
                {metadata.city as string}{metadata.city && metadata.state ? ', ' : ''}{metadata.state as string}
              </span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">ZIP Code:</span>
            <span className="font-medium">{metadata.zipCode as string || "N/A"}</span>
          </div>
          {metadata.customerAddress && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Address:</span>
              <span className="font-medium">{metadata.customerAddress as string}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">DFW Area:</span>
            <Badge variant={metadata.isDfw ? "default" : "secondary"}>
              {metadata.isDfw ? "Yes" : "No"}
            </Badge>
          </div>
        </div>
      </div>

      {/* Equipment Summary */}
      <div>
        <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
          <Package className="h-4 w-4" />
          Scanned Equipment ({equipmentCount} unit{equipmentCount !== 1 ? 's' : ''})
        </h4>
        
        {allEquipment.length > 0 ? (
          <div className="space-y-2">
            {allEquipment.map((equip, idx) => (
              <Card key={equip.id || idx} className="p-3">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                      #{idx + 1}
                    </span>
                    <span className="font-medium">
                      {equip.brand || 'Unknown Brand'} - {equip.equipmentType || 'HVAC'}
                    </span>
                  </div>
                  {getAgeBadge(equip.manufacturedYear)}
                </div>
                
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  {equip.modelNumber && (
                    <div className="flex justify-between col-span-2">
                      <span className="text-muted-foreground">Model:</span>
                      <span className="font-mono text-xs">{equip.modelNumber}</span>
                    </div>
                  )}
                  {equip.serialNumber && (
                    <div className="flex justify-between col-span-2">
                      <span className="text-muted-foreground">Serial:</span>
                      <span className="font-mono text-xs">{equip.serialNumber}</span>
                    </div>
                  )}
                  {equip.tonnage && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tonnage:</span>
                      <span className="font-medium">{equip.tonnage}</span>
                    </div>
                  )}
                  {equip.manufacturedYear && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Year:</span>
                      <span className="font-medium">{equip.manufacturedYear}</span>
                    </div>
                  )}
                  {equip.refrigerant && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Refrigerant:</span>
                      <span className="font-medium">{equip.refrigerant}</span>
                    </div>
                  )}
                  {equip.seerRating && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">SEER:</span>
                      <span className="font-medium">{equip.seerRating}</span>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        ) : (
          // Fallback for legacy single-equipment data format
          <div className="bg-muted/50 rounded-lg p-3 space-y-1 text-sm">
            {metadata.brand && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Brand:</span>
                <span className="font-medium">{metadata.brand as string}</span>
              </div>
            )}
            {metadata.modelNumber && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Model:</span>
                <span className="font-mono text-xs">{metadata.modelNumber as string}</span>
              </div>
            )}
            {metadata.serialNumber && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Serial:</span>
                <span className="font-mono text-xs">{metadata.serialNumber as string}</span>
              </div>
            )}
            {metadata.equipmentType && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Type:</span>
                <span className="font-medium capitalize">{metadata.equipmentType as string}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Marketing Opt-In */}
      <div className="flex items-center gap-2 text-sm">
        {metadata.marketingOptIn ? (
          <>
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span>Opted in to marketing communications</span>
          </>
        ) : (
          <>
            <XCircle className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Did not opt in to marketing</span>
          </>
        )}
      </div>
    </div>
  );
};
