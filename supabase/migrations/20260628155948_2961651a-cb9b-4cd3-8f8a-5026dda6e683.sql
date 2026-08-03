
DROP TRIGGER IF EXISTS trg_crm_suppliers_updated_at ON public.crm_suppliers;
CREATE TRIGGER trg_crm_suppliers_updated_at
  BEFORE UPDATE ON public.crm_suppliers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_material_requests_updated_at ON public.material_requests;
CREATE TRIGGER trg_material_requests_updated_at
  BEFORE UPDATE ON public.material_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_material_requests_log_status ON public.material_requests;
CREATE TRIGGER trg_material_requests_log_status
  BEFORE INSERT OR UPDATE OF status ON public.material_requests
  FOR EACH ROW EXECUTE FUNCTION public.log_material_request_status_change();
