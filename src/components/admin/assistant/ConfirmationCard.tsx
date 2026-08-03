import { CheckCircle, XCircle, Zap } from 'lucide-react';

interface ConfirmationCardProps {
  onConfirm: () => void;
  onCancel: () => void;
  disabled?: boolean;
  action?: 'confirmed' | 'cancelled';
}

export const ConfirmationCard = ({ onConfirm, onCancel, disabled, action }: ConfirmationCardProps) => {
  if (action) {
    return (
      <div className={`mt-2 flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-lg ${
        action === 'confirmed' 
          ? 'bg-green-50 text-green-700 border border-green-200' 
          : 'bg-gray-50 text-gray-500 border border-gray-200'
      }`}>
        {action === 'confirmed' ? (
          <><CheckCircle className="h-3.5 w-3.5" /> Confirmed</>
        ) : (
          <><XCircle className="h-3.5 w-3.5" /> Cancelled</>
        )}
      </div>
    );
  }

  return (
    <div className="mt-3 bg-white border border-amber-200 rounded-xl p-4 shadow-sm">
      <div className="flex items-center gap-1.5 text-amber-700 text-sm font-semibold mb-2">
        <Zap className="h-3.5 w-3.5" />
        Confirm Action
      </div>
      <div className="flex gap-3 mt-3">
        <button
          onClick={onConfirm}
          disabled={disabled}
          className="flex-1 bg-[#1B2A4A] text-white rounded-lg py-2 text-sm font-medium hover:bg-[#243556] disabled:opacity-40 transition-colors flex items-center justify-center gap-1.5"
        >
          <CheckCircle className="h-3.5 w-3.5" /> Confirm
        </button>
        <button
          onClick={onCancel}
          disabled={disabled}
          className="flex-1 bg-white border border-gray-300 text-gray-700 rounded-lg py-2 text-sm hover:bg-gray-50 disabled:opacity-40 transition-colors flex items-center justify-center gap-1.5"
        >
          <XCircle className="h-3.5 w-3.5" /> Cancel
        </button>
      </div>
    </div>
  );
};
