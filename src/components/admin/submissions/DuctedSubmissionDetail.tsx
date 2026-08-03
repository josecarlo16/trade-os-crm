import { Badge } from "@/components/ui/badge";
import { Home, Thermometer, DollarSign, Clock, MapPin, FileText } from "lucide-react";

interface DuctedSubmissionDetailProps {
  metadata: Record<string, unknown>;
}

const formatMoney = (n: number | null | undefined): string => {
  if (n == null) return "$0.00";
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
};

export const DuctedSubmissionDetail = ({ metadata }: DuctedSubmissionDetailProps) => {
  const homeType = metadata.homeType as string | undefined;
  const homeLayout = metadata.homeLayout as string | undefined;
  const squareFootage = metadata.squareFootage as string | undefined;
  const heatingType = metadata.heatingType as string | undefined;
  const coverage = metadata.coverage as string | undefined;
  const systemCount = metadata.systemCount as number | undefined;
  const recommendedTonnage = metadata.recommendedTonnage as number | undefined;
  const equipmentCost = metadata.equipmentCost as number | undefined;
  const installationCost = metadata.installationCost as number | undefined;
  const addonsCost = metadata.addonsCost as number | undefined;
  const taxAmount = metadata.taxAmount as number | undefined;
  const finalTotal = metadata.finalTotal as number | undefined;
  const bestTimeToCall = metadata.bestTimeToCall as string | undefined;
  const address = metadata.address as string | undefined;
  const notes = metadata.notes as string | undefined;

  return (
    <div className="space-y-6">
      {/* Home Details */}
      <div>
        <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
          <Home className="h-4 w-4 text-muted-foreground" />
          Home Details
        </h4>
        <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
          {address && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-3 w-3" />
              {address}
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-muted-foreground">Type:</span>{" "}
              <span className="font-medium capitalize">{homeType || "—"}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Layout:</span>{" "}
              <span className="font-medium capitalize">{homeLayout?.replace(/_/g, " ") || "—"}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Sq Ft:</span>{" "}
              <span className="font-medium">{squareFootage || "—"}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Coverage:</span>{" "}
              <span className="font-medium capitalize">{coverage || "—"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* System Configuration */}
      <div>
        <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
          <Thermometer className="h-4 w-4 text-muted-foreground" />
          System Configuration
        </h4>
        <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-muted-foreground">Heating:</span>{" "}
              <Badge variant="outline" className="ml-1 capitalize">
                {heatingType === "heat_pump" ? "Heat Pump" : heatingType === "gas" ? "Gas" : heatingType || "—"}
              </Badge>
            </div>
            <div>
              <span className="text-muted-foreground">Tonnage:</span>{" "}
              <span className="font-medium">{recommendedTonnage || "—"} ton</span>
            </div>
            <div>
              <span className="text-muted-foreground">Systems:</span>{" "}
              <span className="font-medium">{systemCount || 1}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Pricing Breakdown */}
      <div>
        <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-muted-foreground" />
          Pricing Breakdown
        </h4>
        <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Equipment</span>
            <span>{formatMoney(equipmentCost)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Installation</span>
            <span>{formatMoney(installationCost)}</span>
          </div>
          {addonsCost && addonsCost > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Add-ons</span>
              <span>{formatMoney(addonsCost)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Tax</span>
            <span>{formatMoney(taxAmount)}</span>
          </div>
          <div className="flex justify-between font-medium pt-2 border-t">
            <span>Total</span>
            <span className="text-primary">{formatMoney(finalTotal)}</span>
          </div>
        </div>
      </div>

      {/* Best Time to Call */}
      {bestTimeToCall && (
        <div>
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            Best Time to Call
          </h4>
          <div className="bg-muted/50 rounded-lg p-4 text-sm capitalize">
            {bestTimeToCall.replace(/_/g, " ")}
          </div>
        </div>
      )}

      {/* Customer Notes */}
      {notes && (
        <div>
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            Customer Notes
          </h4>
          <div className="bg-muted/50 rounded-lg p-4 text-sm whitespace-pre-wrap">
            {notes}
          </div>
        </div>
      )}

    </div>
  );
};
