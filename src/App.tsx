import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Loader2 } from "lucide-react";

import NotFound from "./pages/NotFound";

const AdminRouteLayout = lazy(() => import("./components/admin/AdminRouteLayout").then(m => ({ default: m.AdminRouteLayout })));
const AdminLogin = lazy(() => import("./pages/admin/Login"));
const AdminDashboard = lazy(() => import("./pages/admin/Dashboard"));
const AdminUnifiedSubmissions = lazy(() => import("./pages/admin/UnifiedSubmissions"));
const AdminSettings = lazy(() => import("./pages/admin/Settings"));
const AdminUsers = lazy(() => import("./pages/admin/Users"));
const AdminSystemPricing = lazy(() => import("./pages/admin/SystemPricing"));
const AdminMaterials = lazy(() => import("./pages/admin/Materials"));
const AdminLaborRates = lazy(() => import("./pages/admin/LaborRates"));
const AdminEstimates = lazy(() => import("./pages/admin/Estimates"));
const AdminEstimateBuilder = lazy(() => import("./pages/admin/EstimateBuilder"));
const AdminEstimateTemplates = lazy(() => import("./pages/admin/EstimateTemplates"));
const AdminTemplateBuilder = lazy(() => import("./pages/admin/TemplateBuilder"));
const AdminCustomerEquipment = lazy(() => import("./pages/admin/CustomerEquipment"));
const AdminEquipmentLibrary = lazy(() => import("./pages/admin/EquipmentLibrary"));
const AdminIndividualEquipmentPricing = lazy(() => import("./pages/admin/IndividualEquipmentPricing"));
const AdminTrashBin = lazy(() => import("./pages/admin/TrashBin"));
const AdminSuppliers = lazy(() => import("./pages/admin/Suppliers"));
const AdminMaterialRequests = lazy(() => import("./pages/admin/MaterialRequests"));
const AdminMaterialLists = lazy(() => import("./pages/admin/MaterialLists"));
const AdminCustomers = lazy(() => import("./pages/admin/Customers"));
const AdminCustomerDetail = lazy(() => import("./pages/admin/CustomerDetail"));
const AdminCompanies = lazy(() => import("./pages/admin/Companies"));
const AdminCompanyDetail = lazy(() => import("./pages/admin/CompanyDetail"));
const AdminLocations = lazy(() => import("./pages/admin/Locations"));
const AdminPipeline = lazy(() => import("./pages/admin/Pipeline"));
const AdminLeadSourcesConfig = lazy(() => import("./pages/admin/LeadSourcesConfig"));
const AdminCampaignTagsConfig = lazy(() => import("./pages/admin/CampaignTagsConfig"));
const AdminJobs = lazy(() => import("./pages/admin/Jobs"));
const AdminJobDetail = lazy(() => import("./pages/admin/JobDetail"));
const AdminJobTypesConfig = lazy(() => import("./pages/admin/JobTypesConfig"));
const AdminMaintenanceContracts = lazy(() => import("./pages/admin/MaintenanceContracts"));
const AdminMaintenanceContractDetail = lazy(() => import("./pages/admin/MaintenanceContractDetail"));
const AdminMaintenanceContractCandidates = lazy(() => import("./pages/admin/MaintenanceContractCandidates"));
const AdminMaintenanceContractTiers = lazy(() => import("./pages/admin/MaintenanceContractTiers"));
const AdminTeams = lazy(() => import("./pages/admin/Teams"));
const AdminTimesheets = lazy(() => import("./pages/admin/Timesheets"));
const AdminWorkEdgeProjects = lazy(() => import("./pages/admin/WorkEdgeProjects"));
const AdminCalendar = lazy(() => import("./pages/admin/Calendar"));
const AdminDispatchMap = lazy(() => import("./pages/admin/DispatchMap"));
const AdminCalendarSettings = lazy(() => import("./pages/admin/CalendarSettings"));
const AdminAISettings = lazy(() => import("./pages/admin/AISettings"));
const AdminAutomations = lazy(() => import("./pages/admin/Automations"));
const AdminRolePermissions = lazy(() => import("./pages/admin/RolePermissions"));
const AdminTasks = lazy(() => import("./pages/admin/Tasks"));
const AdminDFWWatchList = lazy(() => import("./pages/admin/DFWWatchList"));
const AdminFinancingOptions = lazy(() => import("./pages/admin/FinancingOptions"));
const AdminCosts = lazy(() => import("./pages/admin/AdminCosts"));
const AdminDuctlessConfig = lazy(() => import("./pages/admin/DuctlessConfig"));
const AdminInbox = lazy(() => import("./pages/admin/Inbox"));
const AdminEmailTemplates = lazy(() => import("./pages/admin/EmailTemplates"));
const AdminEmailSettings = lazy(() => import("./pages/admin/EmailSettings"));
const AdminKnowledgeBase = lazy(() => import("./pages/admin/KnowledgeBase"));
const AdminSearchResults = lazy(() => import("./pages/admin/SearchResults"));
const AdminAbandonedCarts = lazy(() => import("./pages/admin/AbandonedCarts"));
const InvoicingMissionControl = lazy(() => import("./pages/admin/invoicing/InvoicingMissionControl"));
const InvoicesList = lazy(() => import("./pages/admin/invoicing/InvoicesList"));
const OttoEstimatesList = lazy(() => import("./pages/admin/invoicing/OttoEstimatesList"));
const InvoiceClients = lazy(() => import("./pages/admin/invoicing/InvoiceClients"));
const PaymentsList = lazy(() => import("./pages/admin/invoicing/PaymentsList"));
const InvoiceTemplates = lazy(() => import("./pages/admin/invoicing/InvoiceTemplates"));
const InvoiceCatalog = lazy(() => import("./pages/admin/invoicing/InvoiceCatalog"));
const InvoiceExpenses = lazy(() => import("./pages/admin/invoicing/InvoiceExpenses"));
const InvoiceReports = lazy(() => import("./pages/admin/invoicing/InvoiceReports"));
const InvoiceSettings = lazy(() => import("./pages/admin/invoicing/InvoiceSettings"));
const AdminSocialStudio = lazy(() => import("./pages/admin/SocialStudio"));
const AdminBlogPosts = lazy(() => import("./pages/admin/BlogPosts"));
const AdminBlogPostEditor = lazy(() => import("./pages/admin/BlogPostEditor"));
const AdminGallery = lazy(() => import("./pages/admin/Gallery"));
const AdminSEOManagement = lazy(() => import("./pages/admin/SEOManagement"));
const AdminSEOEditor = lazy(() => import("./pages/admin/SEOEditor"));
const AdminSEOPerformance = lazy(() => import("./pages/admin/SEOPerformance"));
const AdminSEOUpload = lazy(() => import("./pages/admin/SEOUpload"));
const AdminCalculators = lazy(() => import("./pages/admin/Calculators"));
const AdminCalculatorEditor = lazy(() => import("./pages/admin/CalculatorEditor"));
const AdminLandingPageForms = lazy(() => import("./pages/admin/LandingPageForms"));
const AdminLandingPageFormEditor = lazy(() => import("./pages/admin/LandingPageFormEditor"));
const AdminScannerAnalytics = lazy(() => import("./pages/admin/ScannerAnalytics"));
const AdminButtonClicks = lazy(() => import("./pages/admin/ButtonClicks"));
const AdminAnalyticsTracking = lazy(() => import("./pages/admin/AnalyticsTracking"));
const AdminSocialMediaTracker = lazy(() => import("./pages/admin/SocialMediaTracker"));

import { ProtectedRoute } from "./components/admin/ProtectedRoute";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
  </div>
);

const LazyAdminLayout = () => (
  <Suspense fallback={<PageLoader />}>
    <AdminRouteLayout />
  </Suspense>
);

const router = createBrowserRouter([
  { path: "/", element: <Navigate to="/admin" replace /> },
  { path: "/admin/login", element: <Suspense fallback={<PageLoader />}><AdminLogin /></Suspense> },
  {
    element: <LazyAdminLayout />,
    children: [
      { path: "/admin", element: <ProtectedRoute><AdminDashboard /></ProtectedRoute> },
      { path: "/admin/search", element: <ProtectedRoute><AdminSearchResults /></ProtectedRoute> },
      { path: "/admin/abandoned-carts", element: <ProtectedRoute><AdminAbandonedCarts /></ProtectedRoute> },
      { path: "/admin/customers", element: <ProtectedRoute><AdminCustomers /></ProtectedRoute> },
      { path: "/admin/companies", element: <ProtectedRoute><AdminCompanies /></ProtectedRoute> },
      { path: "/admin/companies/:id", element: <ProtectedRoute><AdminCompanyDetail /></ProtectedRoute> },
      { path: "/admin/customers/:id", element: <ProtectedRoute><AdminCustomerDetail /></ProtectedRoute> },
      { path: "/admin/locations", element: <ProtectedRoute><AdminLocations /></ProtectedRoute> },
      { path: "/admin/submissions", element: <ProtectedRoute><AdminUnifiedSubmissions /></ProtectedRoute> },
      { path: "/admin/pipeline", element: <ProtectedRoute><AdminPipeline /></ProtectedRoute> },
      { path: "/admin/jobs", element: <ProtectedRoute><AdminJobs /></ProtectedRoute> },
      { path: "/admin/jobs/:id", element: <ProtectedRoute><AdminJobDetail /></ProtectedRoute> },
      { path: "/admin/dispatch-map", element: <ProtectedRoute><AdminDispatchMap /></ProtectedRoute> },
      { path: "/admin/job-types", element: <ProtectedRoute><AdminJobTypesConfig /></ProtectedRoute> },
      { path: "/admin/contracts", element: <ProtectedRoute><AdminMaintenanceContracts /></ProtectedRoute> },
      { path: "/admin/contracts/candidates", element: <ProtectedRoute><AdminMaintenanceContractCandidates /></ProtectedRoute> },
      { path: "/admin/maintenance-contracts/tiers", element: <ProtectedRoute><AdminMaintenanceContractTiers /></ProtectedRoute> },
      { path: "/admin/contracts/:id", element: <ProtectedRoute><AdminMaintenanceContractDetail /></ProtectedRoute> },
      { path: "/admin/teams", element: <ProtectedRoute><AdminTeams /></ProtectedRoute> },
      { path: "/admin/timesheets", element: <ProtectedRoute><AdminTimesheets /></ProtectedRoute> },
      { path: "/admin/workedge", element: <ProtectedRoute><AdminWorkEdgeProjects /></ProtectedRoute> },
      { path: "/admin/calendar", element: <ProtectedRoute><AdminCalendar /></ProtectedRoute> },
      { path: "/admin/calendars", element: <ProtectedRoute><AdminCalendarSettings /></ProtectedRoute> },
      { path: "/admin/system-pricing", element: <ProtectedRoute><AdminSystemPricing /></ProtectedRoute> },
      { path: "/admin/materials", element: <ProtectedRoute><AdminMaterials /></ProtectedRoute> },
      { path: "/admin/labor-rates", element: <ProtectedRoute><AdminLaborRates /></ProtectedRoute> },
      { path: "/admin/estimates", element: <ProtectedRoute><AdminEstimates /></ProtectedRoute> },
      { path: "/admin/estimates/:id", element: <ProtectedRoute><AdminEstimateBuilder /></ProtectedRoute> },
      { path: "/admin/estimate-templates", element: <ProtectedRoute><AdminEstimateTemplates /></ProtectedRoute> },
      { path: "/admin/estimate-templates/:id/edit", element: <ProtectedRoute><AdminTemplateBuilder /></ProtectedRoute> },
      { path: "/admin/users", element: <ProtectedRoute><AdminUsers /></ProtectedRoute> },
      { path: "/admin/customer-equipment", element: <ProtectedRoute><AdminCustomerEquipment /></ProtectedRoute> },
      { path: "/admin/equipment-pricing", element: <ProtectedRoute><AdminIndividualEquipmentPricing /></ProtectedRoute> },
      { path: "/admin/equipment-library", element: <ProtectedRoute><AdminEquipmentLibrary /></ProtectedRoute> },
      { path: "/admin/trash-bin", element: <ProtectedRoute><AdminTrashBin /></ProtectedRoute> },
      { path: "/admin/settings", element: <ProtectedRoute><AdminSettings /></ProtectedRoute> },
      { path: "/admin/suppliers", element: <ProtectedRoute><AdminSuppliers /></ProtectedRoute> },
      { path: "/admin/material-requests", element: <ProtectedRoute><AdminMaterialRequests /></ProtectedRoute> },
      { path: "/admin/material-requests/:id", element: <ProtectedRoute><AdminMaterialRequests /></ProtectedRoute> },
      { path: "/admin/material-lists", element: <ProtectedRoute><AdminMaterialLists /></ProtectedRoute> },
      { path: "/admin/lead-sources", element: <ProtectedRoute><AdminLeadSourcesConfig /></ProtectedRoute> },
      { path: "/admin/campaign-tags", element: <ProtectedRoute><AdminCampaignTagsConfig /></ProtectedRoute> },
      { path: "/admin/ai-settings", element: <ProtectedRoute><AdminAISettings /></ProtectedRoute> },
      { path: "/admin/automations", element: <ProtectedRoute><AdminAutomations /></ProtectedRoute> },
      { path: "/admin/permissions", element: <ProtectedRoute><AdminRolePermissions /></ProtectedRoute> },
      { path: "/admin/tasks", element: <ProtectedRoute><AdminTasks /></ProtectedRoute> },
      { path: "/admin/dfw-watchlist", element: <ProtectedRoute><AdminDFWWatchList /></ProtectedRoute> },
      { path: "/admin/financing", element: <ProtectedRoute><AdminFinancingOptions /></ProtectedRoute> },
      { path: "/admin/admin-costs", element: <ProtectedRoute><AdminCosts /></ProtectedRoute> },
      { path: "/admin/ductless-config", element: <ProtectedRoute><AdminDuctlessConfig /></ProtectedRoute> },
      { path: "/admin/inbox", element: <ProtectedRoute><AdminInbox /></ProtectedRoute> },
      { path: "/admin/email-templates", element: <ProtectedRoute><AdminEmailTemplates /></ProtectedRoute> },
      { path: "/admin/email-settings", element: <ProtectedRoute><AdminEmailSettings /></ProtectedRoute> },
      { path: "/admin/invoicing", element: <ProtectedRoute><InvoicingMissionControl /></ProtectedRoute> },
      { path: "/admin/invoices", element: <ProtectedRoute><InvoicesList /></ProtectedRoute> },
      { path: "/admin/otto-estimates", element: <ProtectedRoute><OttoEstimatesList /></ProtectedRoute> },
      { path: "/admin/invoice-clients", element: <ProtectedRoute><InvoiceClients /></ProtectedRoute> },
      { path: "/admin/payments", element: <ProtectedRoute><PaymentsList /></ProtectedRoute> },
      { path: "/admin/invoice-templates", element: <ProtectedRoute><InvoiceTemplates /></ProtectedRoute> },
      { path: "/admin/invoice-catalog", element: <ProtectedRoute><InvoiceCatalog /></ProtectedRoute> },
      { path: "/admin/invoice-expenses", element: <ProtectedRoute><InvoiceExpenses /></ProtectedRoute> },
      { path: "/admin/invoice-reports", element: <ProtectedRoute><InvoiceReports /></ProtectedRoute> },
      { path: "/admin/invoice-settings", element: <ProtectedRoute><InvoiceSettings /></ProtectedRoute> },
      { path: "/admin/invoice-customers", element: <Navigate to="/admin/invoice-clients" replace /> },
      { path: "/admin/knowledge-base", element: <ProtectedRoute><AdminKnowledgeBase /></ProtectedRoute> },
      { path: "/admin/social-studio", element: <ProtectedRoute><AdminSocialStudio /></ProtectedRoute> },
      { path: "/admin/blog", element: <ProtectedRoute><AdminBlogPosts /></ProtectedRoute> },
      { path: "/admin/blog/:id", element: <ProtectedRoute><AdminBlogPostEditor /></ProtectedRoute> },
      { path: "/admin/gallery", element: <ProtectedRoute><AdminGallery /></ProtectedRoute> },
      { path: "/admin/seo", element: <ProtectedRoute><AdminSEOManagement /></ProtectedRoute> },
      { path: "/admin/seo-performance", element: <ProtectedRoute><AdminSEOPerformance /></ProtectedRoute> },
      { path: "/admin/seo/upload", element: <ProtectedRoute><AdminSEOUpload /></ProtectedRoute> },
      { path: "/admin/seo/:id", element: <ProtectedRoute><AdminSEOEditor /></ProtectedRoute> },
      { path: "/admin/calculators", element: <ProtectedRoute><AdminCalculators /></ProtectedRoute> },
      { path: "/admin/calculators/:id", element: <ProtectedRoute><AdminCalculatorEditor /></ProtectedRoute> },
      { path: "/admin/landing-pages", element: <ProtectedRoute><AdminLandingPageForms /></ProtectedRoute> },
      { path: "/admin/landing-pages/new", element: <ProtectedRoute><AdminLandingPageFormEditor /></ProtectedRoute> },
      { path: "/admin/landing-pages/:id", element: <ProtectedRoute><AdminLandingPageFormEditor /></ProtectedRoute> },
      { path: "/admin/scanner-analytics", element: <ProtectedRoute><AdminScannerAnalytics /></ProtectedRoute> },
      { path: "/admin/button-clicks", element: <ProtectedRoute><AdminButtonClicks /></ProtectedRoute> },
      { path: "/admin/analytics", element: <ProtectedRoute><AdminAnalyticsTracking /></ProtectedRoute> },
      { path: "/admin/social-media", element: <ProtectedRoute><AdminSocialMediaTracker /></ProtectedRoute> },
    ],
  },
  { path: "*", element: <NotFound /> },
]);

const App = () => (
  <ThemeProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <RouterProvider router={router} />
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
