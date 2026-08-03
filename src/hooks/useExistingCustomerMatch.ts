import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ExistingCustomerMatch {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  matched_on: "email" | "phone";
}

/**
 * Look up whether a submission's contact info matches an existing CRM customer.
 * Mirrors the dedup logic used in ConvertToCustomerDialog:
 *  1. Exact (case-insensitive) email match
 *  2. 10-digit phone match (digits-only comparison)
 */
export const useExistingCustomerMatch = (
  email: string | null | undefined,
  phone: string | null | undefined,
) => {
  const normalizedEmail = email?.trim().toLowerCase() || "";
  const phoneDigits = (phone || "").replace(/\D/g, "");
  const normalizedPhone = phoneDigits.length === 11 && phoneDigits.startsWith("1")
    ? phoneDigits.slice(1)
    : phoneDigits;

  return useQuery({
    queryKey: ["existing-customer-match", normalizedEmail, normalizedPhone],
    enabled: Boolean(normalizedEmail) || normalizedPhone.length === 10,
    staleTime: 60_000,
    queryFn: async (): Promise<ExistingCustomerMatch | null> => {
      // 1) Email match
      if (normalizedEmail) {
        const { data } = await supabase
          .from("crm_customers")
          .select("id, first_name, last_name, email, phone")
          .ilike("email", normalizedEmail)
          .maybeSingle();
        if (data) return { ...data, matched_on: "email" };
      }

      // 2) Phone match (10-digit, normalized)
      if (normalizedPhone.length === 10) {
        const { data } = await supabase
          .from("crm_customers")
          .select("id, first_name, last_name, email, phone")
          .not("phone", "is", null);
        const match = (data || []).find((c) => {
          const d = (c.phone || "").replace(/\D/g, "");
          const norm = d.length === 11 && d.startsWith("1") ? d.slice(1) : d;
          return norm === normalizedPhone;
        });
        if (match) return { ...match, matched_on: "phone" };
      }

      return null;
    },
  });
};
