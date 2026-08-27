import { 
  LayoutDashboard, 
  FileText, 
  PenSquare,
  Search,
  Calculator,
  Users,
  Settings,
  Share2,
  BarChart3,
  MousePointer,
  Tag,
  FileInput,
  DollarSign,
  Package,
  Receipt,
  ClipboardList,
  ClipboardCheck,
  LayoutTemplate,
  MessageSquare,
  AirVent,
  Images,
  CreditCard,
  Library,
  Target,
  Trash2,
  ScanLine,
  ShoppingCart,
  UserCircle,
  MapPin,
  Kanban,
  Megaphone,
  Tags,
  Briefcase,
  UsersRound,
  Wrench,
  Camera,
  Shield,
  Building2,
  Mail,
  BookOpen,
  Truck,
  LayoutGrid,

} from 'lucide-react';

export interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  permissionKey: string;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export const navSections: NavSection[] = [
  {
    title: 'Overview',
    items: [
      { label: 'Dashboard', href: '/admin', icon: LayoutDashboard, permissionKey: 'nav.dashboard' },
      { label: 'Trade OS', href: '/admin/trade-os', icon: LayoutGrid, permissionKey: 'nav.trade-os' },
      { label: 'Tasks', href: '/admin/tasks', icon: ClipboardList, permissionKey: 'nav.tasks' },
      { label: 'Abandoned Carts', href: '/admin/abandoned-carts', icon: ShoppingCart, permissionKey: 'nav.abandoned-carts' },
    ],
  },
  {
    title: 'CRM',
    items: [
      { label: 'Customers', href: '/admin/customers', icon: UserCircle, permissionKey: 'nav.customers' },
      { label: 'Companies', href: '/admin/companies', icon: Building2, permissionKey: 'nav.companies' },
      { label: 'Locations', href: '/admin/locations', icon: MapPin, permissionKey: 'nav.locations' },
      { label: 'Submissions', href: '/admin/submissions', icon: FileText, permissionKey: 'nav.submissions' },
      { label: 'Pipeline', href: '/admin/pipeline', icon: Kanban, permissionKey: 'nav.pipeline' },
      { label: 'DFW Watch List', href: '/admin/dfw-watchlist', icon: Target, permissionKey: 'nav.dfw-watchlist' },
      { label: 'Inbox', href: '/admin/inbox', icon: Mail, permissionKey: 'nav.inbox' },
      { label: 'Email Settings', href: '/admin/email-settings', icon: Settings, permissionKey: 'nav.email-settings' },
    ],
  },
  {
    title: 'Operations',
    items: [
      { label: 'Calendar', href: '/admin/calendar', icon: LayoutDashboard, permissionKey: 'nav.calendar' },
      { label: 'Map', href: '/admin/dispatch-map', icon: MapPin, permissionKey: 'nav.dispatch-map' },
      { label: 'Jobs Board', href: '/admin/jobs', icon: Briefcase, permissionKey: 'nav.jobs' },
      { label: 'Maintenance Contracts', href: '/admin/contracts', icon: ClipboardCheck, permissionKey: 'nav.maintenance-contracts' },
      { label: 'Teams & Crew', href: '/admin/teams', icon: UsersRound, permissionKey: 'nav.teams' },
      { label: 'Timesheets', href: '/admin/timesheets', icon: ClipboardList, permissionKey: 'nav.timesheets' },
      { label: 'WorkEdge Projects', href: '/admin/workedge', icon: Camera, permissionKey: 'nav.workedge' },
      { label: 'Job Types', href: '/admin/job-types', icon: Wrench, permissionKey: 'nav.job-types' },
      { label: 'Calendar Settings', href: '/admin/calendars', icon: Settings, permissionKey: 'nav.calendars' },
      { label: 'Knowledge Base', href: '/admin/knowledge-base', icon: BookOpen, permissionKey: 'nav.knowledge-base' },

    ],
  },
  {
    title: 'Invoicing & Payments',
    items: [
      { label: 'Mission Control', href: '/admin/invoicing', icon: LayoutDashboard, permissionKey: 'nav.invoicing' },
      { label: 'Invoices', href: '/admin/invoices', icon: Receipt, permissionKey: 'nav.invoices' },
      { label: 'Estimates', href: '/admin/otto-estimates', icon: FileText, permissionKey: 'nav.otto-estimates' },
      { label: 'Clients', href: '/admin/invoice-clients', icon: UserCircle, permissionKey: 'nav.invoice-clients' },
      { label: 'Payments', href: '/admin/payments', icon: CreditCard, permissionKey: 'nav.payments' },
      { label: 'Templates', href: '/admin/invoice-templates', icon: LayoutTemplate, permissionKey: 'nav.invoice-templates' },
      { label: 'Catalog', href: '/admin/invoice-catalog', icon: Package, permissionKey: 'nav.invoice-catalog' },
      { label: 'Expenses', href: '/admin/invoice-expenses', icon: Receipt, permissionKey: 'nav.invoice-expenses' },
      { label: 'Reports', href: '/admin/invoice-reports', icon: BarChart3, permissionKey: 'nav.invoice-reports' },
      { label: 'Settings', href: '/admin/invoice-settings', icon: Settings, permissionKey: 'nav.invoice-settings' },
    ],
  },
  {
    title: 'Content',
    items: [
      { label: 'Blog', href: '/admin/blog', icon: PenSquare, permissionKey: 'nav.blog' },
      { label: 'Gallery', href: '/admin/gallery', icon: Images, permissionKey: 'nav.gallery' },
      { label: 'Equipment Library', href: '/admin/equipment-library', icon: Library, permissionKey: 'nav.equipment-library' },
    ],
  },
  {
    title: 'Estimators',
    items: [
      { label: 'Job Estimates', href: '/admin/estimates', icon: FileText, permissionKey: 'nav.estimates' },
      { label: 'Templates', href: '/admin/estimate-templates', icon: LayoutTemplate, permissionKey: 'nav.estimate-templates' },
      { label: 'Material Lists', href: '/admin/material-lists', icon: ClipboardList, permissionKey: 'nav.material-lists' },
      { label: 'Material Requests', href: '/admin/material-requests', icon: ClipboardList, permissionKey: 'nav.material-requests' },
      { label: 'System Pricing', href: '/admin/system-pricing', icon: DollarSign, permissionKey: 'nav.system-pricing' },
      { label: 'Customer Equipment', href: '/admin/customer-equipment', icon: Package, permissionKey: 'nav.customer-equipment' },
      { label: 'Individual Equipment', href: '/admin/equipment-pricing', icon: Package, permissionKey: 'nav.equipment-pricing' },
      { label: 'Ductless Config', href: '/admin/ductless-config', icon: AirVent, permissionKey: 'nav.ductless-config' },
    ],
  },
  {
    title: 'Financials',
    items: [
      { label: 'Materials', href: '/admin/materials', icon: Package, permissionKey: 'nav.materials' },
      { label: 'Labor Rates', href: '/admin/labor-rates', icon: ClipboardList, permissionKey: 'nav.labor-rates' },
      { label: 'Admin Costs', href: '/admin/admin-costs', icon: Receipt, permissionKey: 'nav.admin-costs' },
      { label: 'Financing', href: '/admin/financing', icon: CreditCard, permissionKey: 'nav.financing' },
    ],
  },
  {
    title: 'Marketing',
    items: [
      { label: 'Social Studio', href: '/admin/social-studio', icon: Megaphone, permissionKey: 'nav.social-studio' },
      { label: 'SEO', href: '/admin/seo', icon: Search, permissionKey: 'nav.seo' },
      { label: 'Calculators', href: '/admin/calculators', icon: Calculator, permissionKey: 'nav.calculators' },
      { label: 'Landing Pages', href: '/admin/landing-pages', icon: FileInput, permissionKey: 'nav.landing-pages' },
      { label: 'Email Templates', href: '/admin/email-templates', icon: Mail, permissionKey: 'nav.email-templates' },
    ],
  },
  {
    title: 'Analytics',
    items: [
      { label: 'Scanner Analytics', href: '/admin/scanner-analytics', icon: ScanLine, permissionKey: 'nav.scanner-analytics' },
      { label: 'Button Clicks', href: '/admin/button-clicks', icon: MousePointer, permissionKey: 'nav.button-clicks' },
      { label: 'Analytics', href: '/admin/analytics', icon: BarChart3, permissionKey: 'nav.analytics' },
      { label: 'Social Media', href: '/admin/social-media', icon: Share2, permissionKey: 'nav.social-media' },
    ],
  },
  {
    title: 'System',
    items: [
      { label: 'Users', href: '/admin/users', icon: Users, permissionKey: 'nav.users' },
      { label: 'Suppliers', href: '/admin/suppliers', icon: Truck, permissionKey: 'nav.suppliers' },
      { label: 'Role Permissions', href: '/admin/permissions', icon: Shield, permissionKey: 'nav.permissions' },
      { label: 'AI Settings', href: '/admin/ai-settings', icon: Settings, permissionKey: 'nav.ai-settings' },
      { label: 'Automations', href: '/admin/automations', icon: Wrench, permissionKey: 'nav.automations' },
      { label: 'Lead Sources', href: '/admin/lead-sources', icon: Megaphone, permissionKey: 'nav.lead-sources' },
      { label: 'Campaign Tags', href: '/admin/campaign-tags', icon: Tags, permissionKey: 'nav.campaign-tags' },
      { label: 'Trash Bin', href: '/admin/trash-bin', icon: Trash2, permissionKey: 'nav.trash-bin' },
      { label: 'Settings', href: '/admin/settings', icon: Settings, permissionKey: 'nav.settings' },
    ],
  },
];
