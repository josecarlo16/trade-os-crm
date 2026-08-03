export type EquipmentDocumentOwnerType = 'individual_equipment' | 'equipment_system';

export type EquipmentDocumentType =
  | 'submittal'
  | 'spec_sheet'
  | 'install_manual'
  | 'owner_manual'
  | 'warranty'
  | 'wiring_diagram'
  | 'cut_sheet'
  | 'energy_guide'
  | 'other';

export interface EquipmentDocument {
  id: string;
  owner_type: EquipmentDocumentOwnerType;
  owner_id: string;
  document_type: EquipmentDocumentType;
  file_name: string;
  display_name: string | null;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  notes: string | null;
  sort_order: number;
  is_default: boolean;
  uploaded_by: string | null;
  uploaded_at: string;
  updated_at: string;
}

export const DOCUMENT_TYPE_LABELS: Record<EquipmentDocumentType, string> = {
  submittal: 'Submittal',
  spec_sheet: 'Spec Sheet',
  install_manual: 'Install Manual',
  owner_manual: 'Owner Manual',
  warranty: 'Warranty',
  wiring_diagram: 'Wiring Diagram',
  cut_sheet: 'Cut Sheet',
  energy_guide: 'Energy Guide',
  other: 'Other',
};

// Tailwind classes per document type (uses semantic tokens where possible)
export const DOCUMENT_TYPE_BADGE: Record<EquipmentDocumentType, string> = {
  submittal: 'bg-[hsl(var(--brand-navy,210_84%_13%))] text-white border-transparent',
  spec_sheet: 'bg-blue-100 text-blue-800 border-blue-200',
  install_manual: 'bg-amber-100 text-amber-900 border-amber-200',
  owner_manual: 'bg-amber-50 text-amber-800 border-amber-200',
  warranty: 'bg-green-100 text-green-800 border-green-200',
  wiring_diagram: 'bg-purple-100 text-purple-800 border-purple-200',
  cut_sheet: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  energy_guide: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  other: 'bg-gray-100 text-gray-800 border-gray-200',
};

export const DOCUMENT_TYPES: EquipmentDocumentType[] = [
  'submittal',
  'spec_sheet',
  'install_manual',
  'owner_manual',
  'warranty',
  'wiring_diagram',
  'cut_sheet',
  'energy_guide',
  'other',
];

export const formatFileSize = (bytes: number | null | undefined): string => {
  if (!bytes && bytes !== 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};
