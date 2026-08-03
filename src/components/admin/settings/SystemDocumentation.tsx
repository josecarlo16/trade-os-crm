import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Download, 
  FileText, 
  Package, 
  LayoutDashboard, 
  Zap, 
  Calculator, 
  CreditCard, 
  Database,
  Users,
  MapPin
} from 'lucide-react';

interface DocumentInfo {
  id: string;
  title: string;
  filename: string;
  description: string;
  icon: React.ReactNode;
  lines: number;
}

const documents: DocumentInfo[] = [
  {
    id: 'admin-dashboard',
    title: 'Admin Dashboard',
    filename: 'ADMIN-DASHBOARD.md',
    description: 'Dashboard architecture, RBAC, navigation structure',
    icon: <LayoutDashboard className="h-5 w-5" />,
    lines: 345,
  },
  {
    id: 'ducted-estimator',
    title: 'Ducted Estimator',
    filename: 'DUCTED-ESTIMATOR.md',
    description: 'Multi-step HVAC estimator with pricing engine',
    icon: <Calculator className="h-5 w-5" />,
    lines: 599,
  },
  {
    id: 'ductless-estimator',
    title: 'Ductless Estimator',
    filename: 'DUCTLESS-ESTIMATOR.md',
    description: 'Mini-split zone configuration and BTU calculations',
    icon: <Calculator className="h-5 w-5" />,
    lines: 672,
  },
  {
    id: 'financing-integration',
    title: 'Financing Integration',
    filename: 'FINANCING-INTEGRATION.md',
    description: 'Synchrony financing plans and payment calculations',
    icon: <CreditCard className="h-5 w-5" />,
    lines: 427,
  },
  {
    id: 'system-pricing',
    title: 'System Pricing Database',
    filename: 'SYSTEM-PRICING-DATABASE.md',
    description: 'Equipment systems and price book management',
    icon: <Database className="h-5 w-5" />,
    lines: 499,
  },
  {
    id: 'crm-system',
    title: 'CRM & Operations System',
    filename: 'CRM-SYSTEM.md',
    description: 'Customer, location, pipeline, jobs, and team management',
    icon: <Users className="h-5 w-5" />,
    lines: 650,
  },
  {
    id: 'crm-locations',
    title: 'CRM Locations Management',
    filename: 'CRM-LOCATIONS.md',
    description: 'Google Maps integration, property data lookup, and equipment tracking',
    icon: <MapPin className="h-5 w-5" />,
    lines: 445,
  },
];

// Documentation content embedded for download
const documentationContent: Record<string, string> = {
  'admin-dashboard': `# Admin Dashboard Documentation

> Last Updated: January 2026

## Overview

The admin dashboard provides a centralized interface for managing submissions, content, pricing, analytics, and integrations. It uses a role-based access control system with \`admin\` and \`manager\` roles.

---

## Architecture

\`\`\`
┌─────────────────────────────────────────────────────────────────────────┐
│                         ADMIN LAYOUT                                     │
├─────────────────────────────────────────────────────────────────────────┤
│ ┌────────────┐ ┌──────────────────────────────────────────────────────┐ │
│ │            │ │                    AdminHeader                       │ │
│ │            │ ├──────────────────────────────────────────────────────┤ │
│ │ AdminSide  │ │                                                      │ │
│ │   bar      │ │                    Page Content                      │ │
│ │            │ │                                                      │ │
│ │ • Overview │ │    (Dashboard, Submissions, Blog, etc.)             │ │
│ │ • Content  │ │                                                      │ │
│ │ • Estima-  │ │                                                      │ │
│ │   tors     │ │                                                      │ │
│ │ • Finan-   │ │                                                      │ │
│ │   cials    │ │                                                      │ │
│ │ • Market-  │ │                                                      │ │
│ │   ing      │ │                                                      │ │
│ │ • Analyt-  │ │                                                      │ │
│ │   ics      │ │                                                      │ │
│ │ • System   │ │                                                      │ │
│ │            │ │                                                      │ │
│ └────────────┘ └──────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
\`\`\`

---

## Navigation Structure

**File:** \`src/components/admin/adminNavConfig.ts\`

### Sections

| Section | Access | Pages |
|---------|--------|-------|
| **Overview** | All roles | Dashboard, Submissions, DFW Watch List* |
| **Content** | Mixed | Blog, Gallery*, Equipment Library* |
| **Estimators** | Admin only | Estimates, Templates, System Pricing, Customer Equipment, Ductless Config |
| **Financials** | Admin only | Materials, Labor Rates, Admin Costs, Financing |
| **Marketing** | Admin only | SEO, Calculators, Landing Pages |
| **Analytics** | Admin only | Scanner Analytics, Button Clicks, Analytics, Social Media |
| **System** | Mixed | Users*, Trash Bin*, Settings |

*Items marked with \`*\` are admin-only within mixed sections.

---

## Dashboard Components

**File:** \`src/pages/admin/Dashboard.tsx\`

### Layout Grid

\`\`\`
┌───────────────────────────────────────────────────────────────┐
│                      STATS CARDS ROW                          │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐             │
│  │ Total   │ │ New     │ │ Reviewed│ │ This    │             │
│  │ Submis- │ │ (count) │ │ (count) │ │ Week    │             │
│  │ sions   │ │         │ │         │ │ (count) │             │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘             │
├───────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────┐ ┌─────────────────────────────┐ │
│  │     QUICK ACTIONS       │ │      LEAD METRICS           │ │
│  │ [Blog] [Site] [Media]   │ │ Total | Conv% | Week | Src  │ │
│  │ [Submissions] [Settings]│ │  150  | 24%   | +12  | Web  │ │
│  └─────────────────────────┘ └─────────────────────────────┘ │
├───────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────┐ ┌─────────────────────────────┐ │
│  │   SUBMISSIONS CHART     │ │    ENGAGEMENT STATS         │ │
│  │   (30-day line chart)   │ │   Button clicks, heatmaps   │ │
│  └─────────────────────────┘ └─────────────────────────────┘ │
├───────────────────────────────────────────────────────────────┤
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────────┐   │
│  │ ACTIVITY FEED │ │ RECENT SUBS   │ │ RECENT CHATS     │   │
│  │ (timeline)    │ │ (table)       │ │ (activity)       │   │
│  └───────────────┘ └───────────────┘ └───────────────────┘   │
└───────────────────────────────────────────────────────────────┘
\`\`\`

### Component Details

#### StatsCards
**File:** \`src/components/admin/dashboard/StatsCards.tsx\`

Displays four key metrics:
- **Total Submissions:** All-time count across all forms
- **New:** Submissions with status \`new\` or null
- **Reviewed:** Submissions with status \`reviewed\`, \`contacted\`, or \`closed\`
- **This Week:** Submissions from the current week

Data sources aggregated:
- \`contact_submissions\`
- \`landing_page_submissions\`
- \`ductless_estimate_submissions\`
- \`equipment_scans\` (with email)

---

## Role-Based Access Control

### Database Table: \`user_roles\`

\`\`\`sql
CREATE TABLE user_roles (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  role app_role NOT NULL,  -- 'admin' or 'manager'
  created_at TIMESTAMPTZ DEFAULT now()
);
\`\`\`

### Hook: \`useUserRole\`
**File:** \`src/hooks/useUserRole.ts\`

\`\`\`typescript
const { role, isLoading } = useUserRole();
// role: 'admin' | 'manager' | null
\`\`\`

### Protected Route Component
**File:** \`src/components/admin/ProtectedRoute.tsx\`

Wraps admin pages to enforce authentication and role requirements.

---

## Related Files

### Core Layout
| File | Purpose |
|------|---------|
| \`src/components/admin/AdminLayout.tsx\` | Main layout wrapper |
| \`src/components/admin/AdminSidebar.tsx\` | Navigation sidebar |
| \`src/components/admin/AdminHeader.tsx\` | Top header bar |
| \`src/components/admin/MobileAdminNav.tsx\` | Mobile navigation |
| \`src/components/admin/adminNavConfig.ts\` | Navigation structure |

### Dashboard Components
| File | Purpose |
|------|---------|
| \`src/components/admin/dashboard/StatsCards.tsx\` | Key metric cards |
| \`src/components/admin/dashboard/QuickActions.tsx\` | Action shortcuts |
| \`src/components/admin/dashboard/LeadMetrics.tsx\` | Conversion metrics |
| \`src/components/admin/dashboard/SubmissionsChart.tsx\` | Trend visualization |
| \`src/components/admin/dashboard/EngagementStats.tsx\` | Click analytics |
| \`src/components/admin/dashboard/ActivityFeed.tsx\` | Activity timeline |
| \`src/components/admin/dashboard/RecentSubmissions.tsx\` | Latest submissions |

### Auth & Access
| File | Purpose |
|------|---------|
| \`src/hooks/useAuth.ts\` | Authentication hook |
| \`src/hooks/useUserRole.ts\` | Role management hook |
| \`src/components/admin/ProtectedRoute.tsx\` | Route protection |

---

## Database Tables Used

| Table | Dashboard Usage |
|-------|-----------------|
| \`contact_submissions\` | Stats, recent submissions |
| \`landing_page_submissions\` | Stats, recent submissions |
| \`ductless_estimate_submissions\` | Stats, recent submissions |
| \`ducted_estimate_submissions\` | Stats, recent submissions |
| \`equipment_scans\` | Stats, activity feed, DFW watch list |
| \`blog_posts\` | Activity feed |
| \`button_clicks\` | Engagement stats |
| \`user_roles\` | Access control |`,

  'ducted-estimator': `# Ducted HVAC Estimator Documentation

## Overview

- **Route**: \`/estimate/ducted\`
- **Purpose**: Multi-step estimator for ducted HVAC systems (AC + Gas Furnace or Heat Pump)
- **Total Steps**: 11 (Steps 0-10)
- **Main Component**: \`src/pages/estimators/ducted/DuctedEstimator.tsx\`

---

## Architecture Diagram

\`\`\`
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DUCTED ESTIMATOR FLOW                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Step 0          Step 1         Step 2          Step 3         Step 4       │
│  ┌──────┐       ┌──────┐       ┌──────┐        ┌──────┐       ┌──────┐      │
│  │ ZIP  │──────▶│ HOME │──────▶│ HOME │───────▶│INSUL-│──────▶│USAGE │      │
│  │ GATE │       │ TYPE │       │DETAILS│       │ATION │       │PTRNS │      │
│  └──────┘       └──────┘       └──────┘        └──────┘       └──────┘      │
│                                                                              │
│  Step 5         Step 6         Step 7          Step 8         Step 9        │
│  ┌──────┐       ┌──────┐       ┌──────┐        ┌──────┐       ┌──────┐      │
│  │HEAT- │──────▶│SYSTEM│──────▶│ TIER │───────▶│QUOTE │──────▶│ INFO │      │
│  │ ING  │       │ SIZE │       │SELECT│        │RESULT│       │SUBMIT│      │
│  └──────┘       └──────┘       └──────┘        └──────┘       └──────┘      │
│                                                              Step 10         │
│                                                              ┌──────┐        │
│                                                              │THANK │        │
│                                                              │ YOU  │        │
│                                                              └──────┘        │
└─────────────────────────────────────────────────────────────────────────────┘
\`\`\`

---

## File Structure

\`\`\`
src/pages/estimators/ducted/
├── DuctedEstimator.tsx           # Main component with step routing
├── context/
│   └── EstimatorContext.tsx      # State management provider
├── hooks/
│   └── useDuctedPricing.ts       # Pricing calculations
├── types/
│   └── index.ts                  # TypeScript interfaces and constants
└── steps/
    ├── Step0ZipCodeGate.tsx      # Service area validation
    ├── Step1HomeType.tsx         # Home type selection
    ├── Step2HomeDetails.tsx      # Layout, sqft, system count
    ├── Step3InsulationFactors.tsx# Attic, windows, age
    ├── Step4UsagePatterns.tsx    # Temperature preferences
    ├── Step5HeatingType.tsx      # Gas vs Heat Pump
    ├── Step6SystemSize.tsx       # Tonnage selection
    ├── Step7EfficiencyTier.tsx   # Efficiency tier selection
    ├── Step8QuoteResults.tsx     # Equipment & pricing display
    ├── Step9CustomerInfo.tsx     # Lead capture form
    └── Step10ThankYou.tsx        # Confirmation page
\`\`\`

---

## State Management

### Context Provider
**File**: \`src/pages/estimators/ducted/context/EstimatorContext.tsx\`

### State Interface (\`DuctedEstimatorState\`)

\`\`\`typescript
interface DuctedEstimatorState {
  // Navigation
  currentStep: number;
  
  // Zip Gate
  zipCode: string;
  zipCity: string | null;
  zipState: string | null;
  isInServiceArea: boolean | null;
  
  // Home Configuration
  homeType: HomeType | null;
  homeLayout: HomeLayout | null;
  systemCount: SystemCount;
  coverage: Coverage | null;
  squareFootage: SquareFootage | null;
  
  // Insulation Factors (affect tonnage)
  atticInsulation: AtticInsulation | null;
  windowType: WindowType | null;
  homeAge: HomeAge | null;
  
  // Usage Patterns
  hotColdSpots: HotColdSpots | null;
  winterTemp: TempPreference | null;
  summerTemp: TempPreference | null;
  
  // System Selection
  heatingType: HeatingType | null;
  selectedTonnage: number | null;
  recommendedTonnage: number | null;
  
  // Equipment Selection
  efficiencyTierId: string | null;
  selectedEquipmentId: string | null;
  selectedAddonIds: string[];
  
  // Customer Info
  customerInfo: CustomerInfo;
  
  // Pricing
  totals: PricingTotals;
}
\`\`\`

---

## Tonnage Calculation Engine

**File**: \`src/pages/estimators/ducted/hooks/useDuctedPricing.ts\`

### Adjustment Factors

\`\`\`typescript
// Attic Insulation Impact
const ATTIC_INSULATION_FACTOR = {
  good: 1.0,      // No adjustment
  average: 1.05,  // +5% capacity needed
  poor: 1.10,     // +10% capacity needed
};

// Window Type Impact
const WINDOW_TYPE_FACTOR = {
  double_pane: 1.0,   // No adjustment
  single_pane: 1.08,  // +8% capacity needed
};

// Home Age Impact
const HOME_AGE_FACTOR = {
  new: 1.0,    // Built after 2000
  mid: 1.05,   // Built 1980-2000
  old: 1.10,   // Built before 1980
};
\`\`\`

### Square Footage Mapping

\`\`\`typescript
function getSquareFootageMidpoint(sqft: SquareFootage): number {
  const mapping = {
    "under_1000": 800,
    "1000_1500": 1250,
    "1500_2000": 1750,
    "2000_2500": 2250,
    "2500_3000": 2750,
    "3000_3500": 3250,
    "3500_4000": 3750,
    "4000_plus": 4500,
  };
  return mapping[sqft];
}
\`\`\`

---

## Pricing Engine

**File**: \`src/pages/estimators/ducted/hooks/useDuctedPricing.ts\`

### Constants

\`\`\`typescript
const TAX_RATE = 0.0825;           // 8.25% Texas sales tax
const FINANCING_TERM_MONTHS = 60;  // 60-month financing
const FINANCING_APR = 0.0999;      // 9.99% APR default
\`\`\`

### Pricing Breakdown Interface

\`\`\`typescript
interface PricingBreakdown {
  equipmentCost: number;      // From ducted_equipment table
  installationCost: number;   // From ducted_equipment table
  addonsCost: number;         // Sum of selected add-ons
  subtotal: number;           // equipment + installation + addons
  taxAmount: number;          // subtotal * TAX_RATE
  finalTotal: number;         // subtotal + taxAmount
  monthlyPayment: number;     // Calculated financing payment
}
\`\`\`

---

## Database Schema

### \`ducted_estimate_submissions\`

| Column | Type | Description |
|--------|------|-------------|
| \`id\` | UUID | Primary key |
| \`customer_name\` | TEXT | Full name |
| \`customer_email\` | TEXT | Email address |
| \`customer_phone\` | TEXT | Phone number |
| \`customer_address\` | TEXT | Full address |
| \`home_type\` | TEXT | single_family, townhome, etc. |
| \`home_layout\` | TEXT | single_story, two_story, multi_story |
| \`square_footage\` | TEXT | Range category |
| \`heating_type\` | TEXT | gas_system, heat_pump |
| \`recommended_tonnage\` | NUMERIC | Calculated tonnage |
| \`efficiency_tier_id\` | UUID | FK to ducted_efficiency_tiers |
| \`equipment_id\` | UUID | FK to ducted_equipment |
| \`final_total\` | NUMERIC | Grand total |

### \`ducted_equipment\`

| Column | Type | Description |
|--------|------|-------------|
| \`id\` | UUID | Primary key |
| \`brand\` | TEXT | Trane, Carrier, Lennox, etc. |
| \`system_name\` | TEXT | Display name |
| \`system_type\` | TEXT | gas_system, heat_pump |
| \`tonnage\` | NUMERIC | 1.5, 2, 2.5, 3, 3.5, 4, 5 |
| \`efficiency_tier_id\` | UUID | FK to ducted_efficiency_tiers |
| \`seer2_rating\` | NUMERIC | SEER2 efficiency rating |
| \`equipment_cost\` | NUMERIC | Equipment price |
| \`installation_labor\` | NUMERIC | Labor cost |

### \`ducted_efficiency_tiers\`

| Column | Type | Description |
|--------|------|-------------|
| \`id\` | UUID | Primary key |
| \`name\` | TEXT | good, better, premium, elite |
| \`display_name\` | TEXT | Good, Better, Premium, Elite |
| \`seer_min\` | NUMERIC | Minimum SEER for tier |
| \`seer_max\` | NUMERIC | Maximum SEER for tier |
| \`features\` | JSONB | Tier features array |

---


## Overview

- **Route**: \`/estimate/ductless\`
- **Purpose**: Multi-zone mini-split system estimator with per-room configuration
- **Total Steps**: 9 (Steps 0-8)
- **Main Component**: \`src/pages/estimators/ductless/DuctlessEstimator.tsx\`

---

## Architecture Diagram

\`\`\`
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DUCTLESS ESTIMATOR FLOW                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Step 0          Step 1         Step 2          Step 3         Step 4       │
│  ┌──────┐       ┌──────┐       ┌──────┐        ┌──────┐       ┌──────┐      │
│  │WELCM │──────▶│ CUST │──────▶│ ROOM │───────▶│ ROOM │──────▶│ UNIT │      │
│  │ HERO │       │ INFO │       │SELECT│        │DETAIL│       │STYLE │      │
│  └──────┘       └──────┘       └──────┘        └──────┘       └──────┘      │
│                                                                              │
│  Step 5         Step 6         Step 7          Step 8                        │
│  ┌──────┐       ┌──────┐       ┌──────┐        ┌──────┐                      │
│  │SYSTEM│──────▶│ ADD- │──────▶│QUOTE │───────▶│THANK │                      │
│  │ TIER │       │ ONS  │       │SUMMARY│       │ YOU  │                      │
│  └──────┘       └──────┘       └──────┘        └──────┘                      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
\`\`\`

---

## File Structure

\`\`\`
src/pages/estimators/ductless/
├── DuctlessEstimator.tsx         # Main component with step routing
├── context/
│   └── QuoteContext.tsx          # State management provider
├── hooks/
│   └── usePricing.ts             # BTU calculations & pricing
├── types/
│   └── index.ts                  # TypeScript interfaces and constants
├── constants/
│   └── serviceArea.ts            # DFW ZIP code validation
├── components/
│   ├── CTAButton.tsx             # Reusable action button
│   ├── PriceBar.tsx              # Sticky price display bar
│   ├── ProgressIndicator.tsx     # Step progress bar
│   ├── SelectableCard.tsx        # Selection card component
│   └── StepContainer.tsx         # Step wrapper with animations
└── steps/
    ├── WelcomeHero.tsx           # Landing page
    ├── CustomerInfoStep.tsx      # Contact & address
    ├── RoomSelector.tsx          # Room type selection
    ├── RoomDetails.tsx           # Per-room configuration
    ├── UnitStyleSelector.tsx     # Indoor unit type selection
    ├── SystemTierComparison.tsx  # Good/Better/Best tier
    ├── AddOnsSelector.tsx        # Optional upgrades
    ├── QuoteSummary.tsx          # Final quote & submit
    └── ThankYou.tsx              # Confirmation page
\`\`\`

---

## State Management

### Room Configuration Interface (\`RoomConfig\`)

\`\`\`typescript
interface RoomConfig {
  id: string;
  roomType: RoomType;
  label: string;
  size: RoomSize;               // small, medium, large
  ceilingHeight: number;        // in feet (8, 9, 10, 12, 14+)
  sunExposure: SunExposure;     // north, east, south, west
  quantity: number;
  recommendedBtu: number;       // Calculated BTU
  unitTypeId?: string;
  garageConfig?: GarageConfig;
}
\`\`\`

### Garage Configuration (\`GarageConfig\`)

\`\`\`typescript
interface GarageConfig {
  isInsulated: boolean;       // Yes = +0, No = +0.25 tons
  isStandalone: boolean;      // Attached = +0, Standalone = +0.5 tons
  hasAtticAbove: boolean;     // Room above = +0, Attic = +0.25 tons
  wantsComfortTemp: boolean;  // Storage = +0, Comfort = +0.25 tons
}
\`\`\`

---

## BTU Calculation Engine

**File**: \`src/pages/estimators/ductless/hooks/usePricing.ts\`

### Room Size to Square Footage Mapping

\`\`\`typescript
const ROOM_SIZE_SQFT = {
  small: 200,   // Up to 250 sq ft
  medium: 325,  // 250-400 sq ft
  large: 500,   // 400-600 sq ft
};
\`\`\`

### Ceiling Height Multipliers

\`\`\`typescript
const CEILING_MULTIPLIERS = {
  8: 1.0,    // Standard 8ft
  9: 1.05,   // +5%
  10: 1.10,  // +10%
  12: 1.15,  // +15%
  14: 1.25,  // +25% (vaulted)
};
\`\`\`

### Sun Exposure Multipliers

\`\`\`typescript
const SUN_EXPOSURE_MULTIPLIERS = {
  north: 1.0,   // Coolest exposure
  east: 1.05,   // Morning sun
  south: 1.10,  // Full day sun
  west: 1.15,   // Hot afternoon sun
};
\`\`\`

### Standard BTU Calculation

\`\`\`typescript
function calculateRoomBtu(room: RoomConfig): number {
  // Base: 20 BTU per square foot
  const baseBtu = ROOM_SIZE_SQFT[room.size] * 20;
  
  // Apply multipliers
  const adjustedBtu = baseBtu 
    * CEILING_MULTIPLIERS[room.ceilingHeight]
    * SUN_EXPOSURE_MULTIPLIERS[room.sunExposure];
  
  // Round to nearest standard size: 6k, 9k, 12k, 15k, 18k, 24k
  return roundToStandardBtu(adjustedBtu);
}
\`\`\`

### Garage BTU Calculation

\`\`\`typescript
function calculateGarageBtu(room: RoomConfig): number {
  const config = room.garageConfig;
  let baseBtu = calculateRoomBtu(room);
  let addedTons = 0;
  
  if (!config.isInsulated) addedTons += 0.25;
  if (config.isStandalone) addedTons += 0.5;
  if (config.hasAtticAbove) addedTons += 0.25;
  if (config.wantsComfortTemp) addedTons += 0.25;
  
  // Convert tons to BTU (1 ton = 12,000 BTU)
  const addedBtu = addedTons * 12000;
  
  return roundToStandardBtu(baseBtu + addedBtu);
}
\`\`\`

---

## Pricing Engine

### Pricing Breakdown Interface

\`\`\`typescript
interface PricingBreakdown {
  baseEquipmentCost: number;  // Sum of per-room unit prices
  tierMultiplier: number;     // From system tier (e.g., 1.0, 1.15, 1.30)
  equipmentTotal: number;     // baseEquipmentCost * tierMultiplier
  addonsCost: number;         // Sum of selected add-ons
  subtotal: number;           // equipmentTotal + addonsCost
  taxAmount: number;          // subtotal * TAX_RATE
  rebates: number;            // Any applicable rebates
  finalTotal: number;         // subtotal + taxAmount - rebates
  monthlyPayment: number;     // Calculated financing payment
}
\`\`\`

### Tier Multiplier Application

\`\`\`typescript
// System tiers have price_multiplier values:
// Good: 1.0, Better: 1.15, Best: 1.30

const tierMultiplier = selectedTier?.price_multiplier ?? 1.0;
const equipmentTotal = baseEquipmentCost * tierMultiplier;
\`\`\`

### Add-on Pricing

\`\`\`typescript
// Add-ons can be fixed or per-zone
interface DuctlessAddon {
  price: number;
  price_type: "fixed" | "per_zone";
}

const addonsCost = selectedAddons.reduce((sum, addon) => {
  if (addon.price_type === "per_zone") {
    return sum + (addon.price * selectedRooms.length);
  }
  return sum + addon.price;
}, 0);
\`\`\`

---

## Database Schema

### \`ductless_estimate_submissions\`

| Column | Type | Description |
|--------|------|-------------|
| \`id\` | UUID | Primary key |
| \`customer_name\` | TEXT | Full name |
| \`customer_email\` | TEXT | Email address |
| \`customer_phone\` | TEXT | Phone number |
| \`customer_address\` | TEXT | Street address |
| \`zone_count\` | INTEGER | Number of zones |
| \`selected_rooms\` | JSONB | Array of RoomConfig objects |
| \`unit_type_id\` | UUID | FK to ductless_unit_types |
| \`system_tier_id\` | UUID | FK to ductless_system_tiers |
| \`selected_addons\` | JSONB | Array of addon IDs |
| \`final_total\` | NUMERIC | Grand total |

### \`ductless_unit_types\`

| Column | Type | Description |
|--------|------|-------------|
| \`id\` | UUID | Primary key |
| \`name\` | TEXT | Internal name |
| \`display_name\` | TEXT | Display name |
| \`base_price\` | NUMERIC | Fallback base price |
| \`benefits\` | JSONB | Array of benefit strings |

### \`ductless_unit_size_pricing\`

| Column | Type | Description |
|--------|------|-------------|
| \`id\` | UUID | Primary key |
| \`unit_type_id\` | UUID | FK to ductless_unit_types |
| \`size_btu\` | INTEGER | BTU size (6000, 9000, etc.) |
| \`price\` | NUMERIC | Price for this size |

### \`ductless_system_tiers\`

| Column | Type | Description |
|--------|------|-------------|
| \`id\` | UUID | Primary key |
| \`name\` | TEXT | good, better, best |
| \`display_name\` | TEXT | Good, Better, Best |
| \`price_multiplier\` | NUMERIC | 1.0, 1.15, 1.30 |
| \`seer_rating\` | NUMERIC | SEER efficiency rating |
| \`warranty_years\` | INTEGER | Warranty period |`,


  'financing-integration': `# Financing Integration Documentation

> Last Updated: January 2026

## Overview

This document describes how financing options are managed in the admin dashboard and displayed in the ducted and ductless estimators. The system uses Synchrony Bank financing with configurable plans.

---

## Architecture

\`\`\`
┌─────────────────────────────────────────────────────────────────────────┐
│                       ADMIN DASHBOARD                                    │
│                   /admin/financing                                       │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                  Financing Options Manager                       │   │
│  │  - Create/Edit financing plans                                   │   │
│  │  - Set APR, payment factors, terms                               │   │
│  │  - Toggle active status                                          │   │
│  │  - Assign to estimator types (ducted/ductless)                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    SUPABASE DATABASE                                     │
│                  financing_options table                                 │
├─────────────────────────────────────────────────────────────────────────┤
│  id | plan_name | promotional_offer | interest_rate | payment_factor   │
│     | months_to_payoff | contractor_fee | applies_to | sort_order      │
│     | is_active                                                         │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                    ┌────────────┴────────────┐
                    │                         │
                    ▼                         ▼
┌─────────────────────────────┐ ┌─────────────────────────────┐
│    DUCTED ESTIMATOR         │ │    DUCTLESS ESTIMATOR       │
│    Step8QuoteResults.tsx    │ │    QuoteSummary.tsx         │
├─────────────────────────────┤ ├─────────────────────────────┤
│  ┌───────────────────────┐  │ │  ┌───────────────────────┐  │
│  │ FinancingOptionsSection│  │ │  │ FinancingOptionsSection│  │
│  │ estimatorType="ducted" │  │ │  │ estimatorType="ductless│  │
│  │ finalTotal={price}     │  │ │  │ finalTotal={price}     │  │
│  └───────────────────────┘  │ │  └───────────────────────┘  │
└─────────────────────────────┘ └─────────────────────────────┘
\`\`\`

---

## Database Schema

### Table: \`financing_options\`

\`\`\`sql
CREATE TABLE public.financing_options (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_name TEXT NOT NULL,
  tran_code TEXT,
  promotional_offer TEXT NOT NULL,
  interest_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
  payment_factor DECIMAL(10,6) NOT NULL DEFAULT 0,
  months_to_payoff INTEGER,
  contractor_fee DECIMAL(5,2) NOT NULL DEFAULT 0,
  dealer_net_cost TEXT,
  notes TEXT,
  applies_to TEXT[] DEFAULT ARRAY['ductless', 'ducted'],
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
\`\`\`

---

## Admin Management

### Page: Financing Options
**File:** \`src/pages/admin/FinancingOptions.tsx\`
**Route:** \`/admin/financing\`

### Features

1. **List All Plans** - Sortable table with all financing options
2. **Create/Edit Plans** - Dialog form for plan details
3. **Delete Plans** - Confirmation required

---

## Estimator Integration

### Component: FinancingOptionsSection
**File:** \`src/components/estimators/FinancingOptionsSection.tsx\`

### Props

\`\`\`typescript
interface FinancingOptionsSectionProps {
  estimatorType: "ducted" | "ductless";
  finalTotal: number;
}
\`\`\`

### Payment Calculation

\`\`\`typescript
// Monthly payment = Total × Payment Factor
const monthlyPayment = finalTotal * plan.payment_factor;

// Example: $14,847 × 0.0125 = $185.59/mo
\`\`\`

---

## Payment Factor Reference

| APR | Term | Factor | Example ($15,000) |
|-----|------|--------|-------------------|
| 9.99% | 132 mo | 0.0125 | $187.50/mo |
| 7.99% | 61 mo | 0.0200 | $300.00/mo |
| 5.99% | 37 mo | 0.0300 | $450.00/mo |
| 3.99% | 57 mo | 0.0260 | $390.00/mo |
| 0.00% | 60 mo | 0.0167 | $250.50/mo |

---

## Synchrony Disclaimers

### Required Disclosures

\`\`\`
*Subject to credit approval. Minimum monthly payments required. 
See store for details. Financing provided by Synchrony Bank.
\`\`\`

---

## Related Files

| File | Purpose |
|------|---------|
| \`src/pages/admin/FinancingOptions.tsx\` | Admin management page |
| \`src/components/estimators/FinancingOptionsSection.tsx\` | Display component |
| \`src/pages/estimators/ducted/steps/Step8QuoteResults.tsx\` | Ducted integration |
| \`src/pages/estimators/ductless/steps/QuoteSummary.tsx\` | Ductless integration |`,

  'system-pricing': `# System Pricing Database Setup

Complete database documentation for the **System Pricing** admin feature, which manages HVAC equipment systems and price book PDFs.

---

## Overview

The System Pricing feature allows administrators to:
- Manage equipment systems with detailed specifications and pricing
- **Separate gas furnace and heat pump system configurations**
- Upload and organize PDF price books from manufacturers
- Import/export equipment data via Excel

---

## Tables

### 1. \`equipment_systems\`

| Column | Type | Description |
|--------|------|-------------|
| \`id\` | uuid | Primary key |
| \`system_name\` | text | Display name (required) |
| \`system_type\` | text | \`'ducted'\` or \`'mini_split'\` |
| \`heating_source\` | text | \`'gas_furnace'\` or \`'heat_pump'\` (ducted only) |
| \`tonnage\` | numeric | System capacity in tons |
| \`ahri_number\` | text | AHRI certification number |
| \`condenser_heat_pump_model\` | text | Outdoor unit model number |
| \`condenser_price\` | numeric | Outdoor unit cost |
| \`furnace_model\` | text | Gas furnace model |
| \`furnace_price\` | numeric | Furnace cost |
| \`furnace_btu_input\` | integer | Furnace heating capacity |
| \`furnace_afue\` | numeric | Furnace efficiency |
| \`air_handler_model\` | text | Air handler model (heat pump) |
| \`air_handler_price\` | numeric | Air handler cost |
| \`evap_coil_model\` | text | Evaporator coil model |
| \`evap_coil_price\` | numeric | Evaporator coil cost |
| \`heat_kit\` | text | Electric heat kit model |
| \`heat_kit_price\` | numeric | Heat kit cost |
| \`system_price\` | numeric | Total calculated system price |
| \`seer2\` | numeric | SEER2 efficiency rating |
| \`eer2\` | numeric | EER2 efficiency rating |
| \`hspf2\` | numeric | HSPF2 heating efficiency |

---

## System Types and Heating Sources

### Ducted Systems

| Heating Source | Indoor Unit | Key Fields |
|----------------|-------------|------------|
| \`gas_furnace\` | Gas Furnace | \`furnace_model\`, \`furnace_price\`, \`furnace_btu_input\`, \`furnace_afue\` |
| \`heat_pump\` | Air Handler | \`air_handler_model\`, \`air_handler_price\`, \`air_handler_cfm\`, \`heat_kit\`, \`heat_kit_price\` |

---

## Auto-Calculated System Price

**Gas Furnace Systems:**
\`\`\`
system_price = condenser_price + furnace_price + evap_coil_price
\`\`\`

**Heat Pump Systems:**
\`\`\`
system_price = condenser_price + air_handler_price + evap_coil_price + heat_kit_price
\`\`\`

---

## Row Level Security (RLS) Policies

### \`equipment_systems\` Policies

| Policy Name | Operation | Using/With Check |
|-------------|-----------|------------------|
| \`Admins can view equipment systems\` | SELECT | \`has_role(auth.uid(), 'admin')\` |
| \`Admins can insert equipment systems\` | INSERT | \`has_role(auth.uid(), 'admin')\` |
| \`Admins can update equipment systems\` | UPDATE | \`has_role(auth.uid(), 'admin')\` |
| \`Admins can delete equipment systems\` | DELETE | \`has_role(auth.uid(), 'admin')\` |

---

## TypeScript Interfaces

\`\`\`typescript
interface EquipmentSystem {
  id: string;
  system_name: string;
  system_type: 'ducted' | 'mini_split';
  heating_source: 'gas_furnace' | 'heat_pump' | null;
  tonnage: number | null;
  ahri_number: string | null;
  
  // Outdoor unit
  condenser_heat_pump_model: string | null;
  condenser_price: number | null;
  
  // Furnace (gas systems only)
  furnace_model: string | null;
  furnace_price: number | null;
  furnace_btu_input: number | null;
  furnace_afue: number | null;
  
  // Air handler (heat pump systems only)
  air_handler_model: string | null;
  air_handler_price: number | null;
  
  // Common equipment
  evap_coil_model: string | null;
  evap_coil_price: number | null;
  heat_kit: string | null;
  heat_kit_price: number | null;
  
  // Efficiency ratings
  seer2: number | null;
  eer2: number | null;
  hspf2: number | null;
  
  // Calculated total
  system_price: number | null;
}
\`\`\`

---

## Usage Examples

### Fetch Equipment Systems

\`\`\`typescript
import { supabase } from "@/integrations/supabase/client";

// Get all ducted gas furnace systems
const { data, error } = await supabase
  .from('equipment_systems')
  .select('*')
  .eq('system_type', 'ducted')
  .eq('heating_source', 'gas_furnace')
  .order('tonnage', { ascending: true });

// Get all heat pump systems
const { data, error } = await supabase
  .from('equipment_systems')
  .select('*')
  .eq('heating_source', 'heat_pump')
  .order('tonnage', { ascending: true });
\`\`\`

---

## Related Files

| File | Purpose |
|------|---------|
| \`src/pages/admin/SystemPricing.tsx\` | Admin UI for managing systems and price books |
| \`src/integrations/supabase/types.ts\` | Auto-generated TypeScript types |`,

  'crm-system': `# CRM & Operations System Documentation

> Last Updated: February 2026

## Overview

The internal CRM system manages the complete customer lifecycle from lead capture through job completion. This system provides:

- **Customer Management** - Contact records, lifecycle tracking, segmentation
- **Location Management** - Multi-property support with property data enrichment
- **Interaction Logging** - Activity timeline with manual and automated entries
- **Pipeline Management** - Kanban-style lead tracking with conversion metrics
- **Job Management** - Service scheduling, crew assignments, stage workflows
- **Team Management** - Technicians, crews, certifications, availability

---

## Architecture Diagram

\`\`\`
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CRM SYSTEM ARCHITECTURE                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                        LEAD SOURCES                                  │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐     │    │
│  │  │ Ducted   │  │ Ductless │  │Equipment │  │ Landing Page     │     │    │
│  │  │Estimator │  │Estimator │  │ Scanner  │  │ Forms            │     │    │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────────┬─────────┘     │    │
│  └───────┼─────────────┼─────────────┼─────────────────┼───────────────┘    │
│          │             │             │                 │                     │
│          ▼             ▼             ▼                 ▼                     │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    SUBMISSION CONVERSION                             │    │
│  │  ConvertToCustomerDialog → Creates crm_customers + crm_locations     │    │
│  │                          → Links via crm_submission_links            │    │
│  │                          → Optional pipeline entry                   │    │
│  └──────────────────────────────────┬──────────────────────────────────┘    │
│                                     │                                        │
│                                     ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                        CRM CORE TABLES                               │    │
│  │                                                                       │    │
│  │  ┌─────────────────┐      ┌─────────────────┐                        │    │
│  │  │  crm_customers  │◄────►│  crm_locations  │                        │    │
│  │  │  - first_name   │      │  - address      │                        │    │
│  │  │  - last_name    │      │  - city/state   │                        │    │
│  │  │  - email/phone  │      │  - sqft/year    │                        │    │
│  │  │  - status       │      │  - lat/lng      │                        │    │
│  │  │  - lead_source  │      │  - is_primary   │                        │    │
│  │  │  - tags[]       │      └─────────────────┘                        │    │
│  │  └────────┬────────┘                                                 │    │
│  │           │                                                          │    │
│  │           ├──────────────────────────────────────────┐               │    │
│  │           │                                          │               │    │
│  │           ▼                                          ▼               │    │
│  │  ┌─────────────────┐                        ┌─────────────────┐      │    │
│  │  │crm_interactions │                        │crm_pipeline_    │      │    │
│  │  │ - type (call,   │                        │    entries      │      │    │
│  │  │   email, note)  │                        │ - stage_id      │      │    │
│  │  │ - direction     │                        │ - estimated_    │      │    │
│  │  │ - content       │                        │     value       │      │    │
│  │  │ - outcome       │                        │ - probability   │      │    │
│  │  └─────────────────┘                        └─────────────────┘      │    │
│  │                                                                       │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                     │                                        │
│                                     ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                        OPERATIONS MODULE                             │    │
│  │                                                                       │    │
│  │  ┌─────────────────┐      ┌─────────────────┐                        │    │
│  │  │    crm_jobs     │◄────►│crm_job_         │                        │    │
│  │  │  - job_number   │      │  appointments   │                        │    │
│  │  │  - job_type_id  │      │  - start/end    │                        │    │
│  │  │  - customer_id  │      │  - google_cal   │                        │    │
│  │  │  - location_id  │      │  - team_id      │                        │    │
│  │  │  - stage_id     │      └─────────────────┘                        │    │
│  │  └────────┬────────┘                                                 │    │
│  │           │                                                          │    │
│  │           ▼                                                          │    │
│  │  ┌─────────────────┐      ┌─────────────────┐                        │    │
│  │  │crm_job_stage_   │      │  crm_teams /    │                        │    │
│  │  │    history      │      │ crm_team_members│                        │    │
│  │  │ - from_stage    │      │  - role         │                        │    │
│  │  │ - to_stage      │      │  - certifications│                       │    │
│  │  │ - changed_by    │      │  - availability │                        │    │
│  │  └─────────────────┘      └─────────────────┘                        │    │
│  │                                                                       │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
\`\`\`

---

## Database Schema

### Core CRM Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| \`crm_customers\` | Customer master records | first_name, last_name, email, phone, customer_status, customer_type, lead_source, tags[] |
| \`crm_locations\` | Service addresses | customer_id, address_line1, city, state, zip_code, square_footage, year_built, stories, latitude, longitude |
| \`crm_customer_contacts\` | Additional contacts | customer_id, first_name, last_name, email, phone, contact_type |
| \`crm_interactions\` | Activity log | customer_id, interaction_type, direction, content, outcome, logged_by |
| \`crm_submission_links\` | Links submissions to customers | customer_id, submission_id, submission_type |

### Pipeline Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| \`crm_pipeline_stages\` | Stage definitions | name, display_name, color, sort_order, is_won_stage, is_lost_stage |
| \`crm_pipeline_entries\` | Lead tracking | customer_id, stage_id, estimated_value, probability, expected_close_date |

### Operations Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| \`crm_job_types\` | Job type definitions | name, slug, category, default_duration_hours, requires_permit |
| \`crm_job_stages\` | Per-type workflow stages | job_type_id, name, stage_type, sort_order, auto_notify_customer |
| \`crm_jobs\` | Job records | job_number, customer_id, location_id, job_type_id, current_stage_id, scheduled_date |
| \`crm_job_appointments\` | Timed appointments | job_id, start_datetime, end_datetime, assigned_team_id, google_calendar_event_id |
| \`crm_job_stage_history\` | Stage transition audit | job_id, from_stage_id, to_stage_id, changed_by, notes |
| \`crm_job_assignments\` | Crew/tech assignments | job_id, team_id, member_id, role, scheduled_start, scheduled_end |

### Team Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| \`crm_teams\` | Crew definitions | name, color, is_active |
| \`crm_team_members\` | Technician records | first_name, last_name, role, certifications[], hourly_rate, license_number |
| \`crm_team_assignments\` | Member-to-team mapping | team_id, member_id, is_lead, role_in_team |

### Configuration Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| \`lead_sources\` | Lead origin tracking | name, slug, description, is_active |
| \`crm_campaign_tags\` | Marketing segmentation | name, color, description, is_active |

---

## Customer Management

### Admin Route
**Route:** \`/admin/customers\`
**File:** \`src/pages/admin/Customers.tsx\`

### Customer Status Lifecycle

\`\`\`
┌────────┐     ┌──────────┐     ┌────────┐     ┌──────────┐     ┌────────┐
│  lead  │────▶│ prospect │────▶│ active │────▶│ inactive │────▶│ former │
└────────┘     └──────────┘     └────────┘     └──────────┘     └────────┘
\`\`\`

| Status | Description |
|--------|-------------|
| \`lead\` | Initial contact, not yet qualified |
| \`prospect\` | Qualified, quote sent or scheduled |
| \`active\` | Has ongoing job or recent service |
| \`inactive\` | No activity in 12+ months |
| \`former\` | Relationship ended |

### Features
- **Customer Table:** Sortable, filterable by status/source/tags
- **CSV Import:** Batch import with header mapping
- **Customer Detail:** Tabbed view (Overview, Locations, Activity, Jobs, Submissions)

---

## Location Management

### Property Data Lookup
**Edge Function:** \`supabase/functions/lookup-property-data/index.ts\`

Automatically fetches property details from county GIS/CAD systems:

| County | Available Data |
|--------|---------------|
| Dallas | SqFt, Year Built, Stories |
| Denton | SqFt, Year Built |
| Collin | Year Built |
| Tarrant | Attom API fallback |

### Features
- **Address Autocomplete:** Google Places integration
- **Map Preview:** Visual verification of address
- **Multi-Property:** Customers can have multiple service locations

---

## Interaction Logging

### Interaction Types

| Type | Icon | Description |
|------|------|-------------|
| \`call\` | Phone | Inbound/outbound phone call |
| \`email\` | Mail | Email correspondence |
| \`text\` | Message | SMS message |
| \`meeting\` | Calendar | In-person or video meeting |
| \`note\` | FileText | Internal note |
| \`task\` | CheckSquare | Follow-up task |

### Automated Logging
Events with \`direction: null\` are system-generated:
- \`system_conversion\` - Lead converted to customer
- \`system_pipeline_add\` - Added to pipeline
- \`system_pipeline_move\` - Stage changed
- \`system_status_change\` - Status updated

---

## Pipeline Management

### Route
**Route:** \`/admin/pipeline\`
**File:** \`src/pages/admin/Pipeline.tsx\`

### Default Stages

| Stage | Type | Color |
|-------|------|-------|
| New Lead | open | Blue |
| Contacted | open | Yellow |
| Estimate Scheduled | open | Orange |
| Proposal Sent | open | Purple |
| Negotiating | open | Pink |
| Won | won | Green |
| Lost | lost | Gray |

### Features
- **Kanban Board:** Drag-and-drop between stages
- **Conversion Flow:** Transform submissions to customers
- **Value Tracking:** Estimated value and probability per entry

---

## Job Management

### Routes
- **List:** \`/admin/jobs\`
- **Detail:** \`/admin/jobs/:id\`

### Job Number Format
Auto-generated: \`TRU-YYYY-XXXX\` (e.g., TRU-2026-0042)

### Two-Tier Scheduling

1. **Job Level:** DATE fields for overall job window
2. **Appointment Level:** TIMESTAMPTZ for precise timing with Google Calendar sync

### Job Types & Stages
Each job type has configurable workflow stages with:
- Stage type (start, progress, end)
- Auto-notify customer flag
- Sort order

---

## Team Management

### Route
**Route:** \`/admin/teams\`

### Team Member Data

\`\`\`typescript
interface TeamMember {
  first_name: string;
  last_name: string;
  role: string;              // "Lead Installer", "Technician"
  member_type: string;       // "employee", "contractor"
  hourly_rate: number;
  certifications: string[];  // ["EPA 608", "NATE"]
  specialties: string[];     // ["Ductless", "Commercial"]
  license_number: string;
  license_expiry: string;
}
\`\`\`

### Job Assignments
Jobs can be assigned to teams (crews) or individual members with:
- Assignment type (primary, support)
- Scheduled start/end times
- Actual hours tracked

---

## Lead Sources & Campaign Tags

### Lead Sources
Single acquisition origin (from \`lead_sources\` table):
- Mitsubishi Partner Program
- Google Ads
- Facebook Ads
- Referral
- Website Organic

### Campaign Tags
Multiple marketing labels stored as array on customer:
- Spring 2025 Campaign
- Heat Pump Promo
- Newsletter Subscriber

---

## Submission Links

Links form submissions to customer records without losing original data:

\`\`\`typescript
// Table: crm_submission_links
{
  customer_id: string;
  submission_id: string;
  submission_type: 'ducted' | 'ductless' | 'scanner' | 'landing_page' | 'contact';
}
\`\`\`

---

## RLS Policies

All CRM tables use role-based policies:

| Role | View | Create | Edit | Delete |
|------|------|--------|------|--------|
| \`super_admin\` | ✅ | ✅ | ✅ | ✅ |
| \`admin\` | ✅ | ✅ | ✅ | ✅ |
| \`manager\` | ✅ | ✅ | ✅ | ❌ |

---

## Related Files

### Customer Management
| File | Purpose |
|------|---------|
| \`src/pages/admin/Customers.tsx\` | Customer list page |
| \`src/pages/admin/CustomerDetail.tsx\` | Customer detail page |
| \`src/components/admin/customers/CustomerTable.tsx\` | Sortable customer table |
| \`src/components/admin/customers/CustomerFormDialog.tsx\` | Add/edit dialog |
| \`src/components/admin/customers/CustomerImportDialog.tsx\` | CSV import |

### Location Management
| File | Purpose |
|------|---------|
| \`src/pages/admin/Locations.tsx\` | Location management page |
| \`src/components/MapPreview.tsx\` | Static map display |
| \`src/lib/propertyLookup.ts\` | Property data API client |
| \`supabase/functions/lookup-property-data/index.ts\` | County GIS lookups |

### Pipeline & Jobs
| File | Purpose |
|------|---------|
| \`src/pages/admin/Pipeline.tsx\` | Kanban board |
| \`src/pages/admin/Jobs.tsx\` | Job list page |
| \`src/pages/admin/JobDetail.tsx\` | Job detail page |
| \`src/components/admin/submissions/ConvertToCustomerDialog.tsx\` | Conversion flow |

### Teams
| File | Purpose |
|------|---------|
| \`src/pages/admin/Teams.tsx\` | Team/member management |`,

  'crm-locations': `# CRM Locations Management - Implementation Guide

> **Feature:** Customer location management with Google Maps and property data lookup  
> **Integrates With:** Existing CRM System (crm_customers, crm_locations)

---

## Overview

This implementation enhances the CRM locations system with:

✅ Google Places address autocomplete  
✅ Interactive Google Maps display  
✅ "Lookup Property Data" button (manual trigger)  
✅ County auto-population  
✅ Equipment tracking per location  
✅ Service history management  

---

## Quick Start

### 1. Google Maps API Setup

1. Enable: Maps JavaScript API, Places API, Maps Embed API, Geocoding API
2. Create API Key & restrict to your domains
3. Add to \`.env\`: \`VITE_GOOGLE_PLACES_API_KEY=your_key\`
4. Add to Supabase secrets: \`GOOGLE_PLACES_API_KEY\`

### 2. Database Tables

**crm_locations** - Enhanced with:
- \`google_place_id\`, \`formatted_address\`, \`latitude\`, \`longitude\`
- \`lot_size_sqft\`, \`bedrooms\`, \`bathrooms\`
- \`gate_code\`, \`access_notes\`, \`parking_instructions\`
- \`property_data_source\`, \`property_data_verified_at\`

**crm_location_equipment** - HVAC equipment tracking  
**crm_location_service_history** - Service records

---

## Component Architecture

### Main Page: Locations.tsx
- Location list with filters (search, customer, type)
- Stats cards (total, residential, commercial, primary)
- Add/edit/delete locations

### AddLocationDialog.tsx
- Customer selection dropdown
- "Use Billing Address" quick-fill
- Google Places autocomplete
- "Lookup Property Data" button
- Google Maps preview
- Property details fields

### LocationDetailsDialog.tsx
- Full location details view
- Map display
- Access information
- Edit button

### GooglePlacesAutocomplete.tsx
- Address search as you type
- Auto-fills all address fields
- Extracts county from Google

### LocationMapEmbed.tsx
- Interactive Google Map embed
- Coordinates display
- Link to Google Maps

---

## Property Data Lookup Flow

\`\`\`
User enters/selects address
        ↓
User clicks "Lookup Property Data"
        ↓
Edge function queries APIs:
  1. US Census/ACS (year built estimates)
  2. Google Geocoding (county extraction)
  3. County Assessor APIs (DFW)
        ↓
Form fields auto-fill (user can override)
\`\`\`

---

## File Reference

| File | Purpose |
|------|---------|
| \`src/pages/admin/Locations.tsx\` | Main locations page |
| \`src/components/admin/locations/AddLocationDialog.tsx\` | Add/edit form |
| \`src/components/admin/locations/LocationDetailsDialog.tsx\` | View details |
| \`src/components/admin/locations/GooglePlacesAutocomplete.tsx\` | Address search |
| \`src/components/admin/locations/LocationMapEmbed.tsx\` | Map display |
| \`src/types/crmLocations.ts\` | TypeScript types |
| \`supabase/functions/lookup-property-data/\` | Property lookup edge function |`,
};

export const SystemDocumentation = () => {
  const { toast } = useToast();
  const [downloading, setDownloading] = useState<string | null>(null);

  const downloadDocument = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownload = (docId: string, filename: string) => {
    setDownloading(docId);
    const content = documentationContent[docId];
    if (content) {
      downloadDocument(content, filename);
      toast({
        title: 'Download started',
        description: `${filename} is being downloaded.`,
      });
    }
    setTimeout(() => setDownloading(null), 500);
  };

  const handleDownloadAll = () => {
    setDownloading('all');
    
    const now = new Date();
    const timestamp = now.toISOString().split('T')[0];
    
    let combinedContent = `# Truficient Admin System Documentation
Generated: ${now.toLocaleDateString('en-US', { 
  year: 'numeric', 
  month: 'long', 
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
})}

---

## Table of Contents

${documents.map((doc, idx) => `${idx + 1}. [${doc.title}](#${doc.id})`).join('\n')}

---

`;

    documents.forEach((doc) => {
      const content = documentationContent[doc.id];
      if (content) {
        combinedContent += `\n\n---\n\n<a id="${doc.id}"></a>\n\n${content}`;
      }
    });

    downloadDocument(combinedContent, `truficient-system-docs-${timestamp}.md`);
    
    toast({
      title: 'Combined export started',
      description: 'All documentation is being downloaded as a single file.',
    });
    
    setTimeout(() => setDownloading(null), 500);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Download system documentation for use with external AI assistants like Claude or ChatGPT.
      </p>

      <div className="space-y-3">
        {documents.map((doc) => (
          <Card key={doc.id} className="border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="shrink-0 p-2 rounded-md bg-muted">
                    {doc.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{doc.title}</p>
                      <Badge variant="outline" className="shrink-0 text-xs">
                        {doc.lines} lines
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {doc.description}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownload(doc.id, doc.filename)}
                  disabled={downloading === doc.id}
                  className="shrink-0"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {downloading === doc.id ? 'Downloading...' : 'Download'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="pt-4 border-t">
        <Button
          onClick={handleDownloadAll}
          disabled={downloading === 'all'}
          className="w-full gap-2"
        >
          <Package className="h-4 w-4" />
          {downloading === 'all' ? 'Preparing Download...' : 'Download All Documentation (Combined)'}
        </Button>
        <p className="text-xs text-muted-foreground text-center mt-2">
          Generates a single markdown file with table of contents
        </p>
      </div>
    </div>
  );
};
