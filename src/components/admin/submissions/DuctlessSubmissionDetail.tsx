import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { MapPin, Thermometer, DollarSign } from "lucide-react";

interface DuctlessSubmissionDetailProps {
  metadata: Record<string, unknown>;
}

const formatMoney = (n: number | null | undefined) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(n || 0));

export const DuctlessSubmissionDetail = ({ metadata }: DuctlessSubmissionDetailProps) => {
  const address = metadata.address as string | null;
  const city = metadata.city as string | null;
  const state = metadata.state as string | null;
  const zip = metadata.zip as string | null;
  const county = metadata.county as string | null;
  const zoneCount = metadata.zoneCount as number | null;
  const selectedRooms = metadata.selectedRooms as any[] | null;
  const unitTypeId = metadata.unitTypeId as string | null;
  const systemTierId = metadata.systemTierId as string | null;
  const selectedAddons = metadata.selectedAddons as any[] | null;
  const subtotal = metadata.subtotal as number | null;
  const taxAmount = metadata.taxAmount as number | null;
  const rebates = metadata.rebates as number | null;
  const finalTotal = metadata.finalTotal as number | null;
  const notes = metadata.notes as string | null;

  // Fetch unit type and tier names
  const { data: unitType } = useQuery({
    queryKey: ["ductless_unit_type", unitTypeId],
    queryFn: async () => {
      if (!unitTypeId) return null;
      const { data } = await supabase
        .from("ductless_unit_types")
        .select("display_name")
        .eq("id", unitTypeId)
        .single();
      return data;
    },
    enabled: !!unitTypeId,
  });

  const { data: systemTier } = useQuery({
    queryKey: ["ductless_system_tier", systemTierId],
    queryFn: async () => {
      if (!systemTierId) return null;
      const { data } = await supabase
        .from("ductless_system_tiers")
        .select("display_name, tier_level")
        .eq("id", systemTierId)
        .single();
      return data;
    },
    enabled: !!systemTierId,
  });

  const { data: addons } = useQuery({
    queryKey: ["ductless_addons"],
    queryFn: async () => {
      const { data } = await supabase.from("ductless_addons").select("id, name");
      return data;
    },
  });

  const addonMap = new Map(addons?.map((a) => [a.id, a.name]) || []);

  const fullAddress = [address, city, state, zip].filter(Boolean).join(", ");

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
        Ductless Estimate Details
      </h3>

      {/* Address */}
      {fullAddress && (
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>Address</span>
          </div>
          <p className="text-sm font-medium">{fullAddress}</p>
          {county && <p className="text-xs text-muted-foreground">{county} County</p>}
        </div>
      )}

      {/* System Configuration */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Thermometer className="h-4 w-4" />
          <span>System Configuration</span>
        </div>
        <div className="bg-muted/50 p-3 rounded-md space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Zones:</span>
            <Badge variant="secondary">{zoneCount || 0}</Badge>
          </div>
          {unitType && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Unit Type:</span>
              <span className="font-medium">{unitType.display_name}</span>
            </div>
          )}
          {systemTier && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">System Tier:</span>
              <div className="flex items-center gap-2">
                <span className="font-medium">{systemTier.display_name}</span>
                <Badge variant="outline" className="text-xs capitalize">
                  {systemTier.tier_level}
                </Badge>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Rooms */}
      {selectedRooms && selectedRooms.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Selected Rooms</p>
          <div className="space-y-2">
            {selectedRooms.map((room: any, idx: number) => (
              <div key={idx} className="bg-muted/30 p-2 rounded-md">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {room.label || room.name || room.type || `Room ${idx + 1}`}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {room.recommendedBtu?.toLocaleString() || "—"} BTU
                  </Badge>
                </div>
                {(room.unitTypeName || room.size) && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {room.unitTypeName && <span>{room.unitTypeName}</span>}
                    {room.unitTypeName && room.size && <span> • </span>}
                    {room.size && <span className="capitalize">{room.size}</span>}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add-ons */}
      {selectedAddons && selectedAddons.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Selected Add-ons</p>
          <div className="flex flex-wrap gap-1">
            {selectedAddons.map((addon: any, idx: number) => (
              <Badge key={idx} variant="secondary" className="text-xs">
                {typeof addon === "string" ? addonMap.get(addon) || addon : addon.name || `Add-on ${idx + 1}`}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Pricing Breakdown */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <DollarSign className="h-4 w-4" />
          <span>Pricing</span>
        </div>
        <div className="bg-muted/50 p-3 rounded-md space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal:</span>
            <span>{formatMoney(subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Tax:</span>
            <span>{formatMoney(taxAmount)}</span>
          </div>
          {(rebates ?? 0) > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Rebates:</span>
              <span>-{formatMoney(rebates)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm font-semibold border-t pt-2">
            <span>Total:</span>
            <span>{formatMoney(finalTotal)}</span>
          </div>
        </div>
      </div>

      {/* Notes */}
      {notes && (
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Notes</p>
          <p className="text-sm bg-muted/50 p-3 rounded-md whitespace-pre-wrap">{notes}</p>
        </div>
      )}
    </div>
  );
};
