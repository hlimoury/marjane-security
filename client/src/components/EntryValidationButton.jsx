import { useState } from 'react';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import { setEntryValidation } from '../services/api';

export function EntryValidationButton({ instanceId, category, entry, onChanged }) {
  const { isRegion } = useAuth();
  const [busy, setBusy] = useState(false);

  if (!isRegion() || !entry?._id) return null;

  const toggle = async () => {
    try {
      setBusy(true);
      await setEntryValidation({
        instanceId,
        category,
        entryId: entry._id,
        validated: !entry.validated,
      });
      toast.success(entry.validated ? 'Validation annulée' : 'Entrée validée');
      if (onChanged) await onChanged();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur de validation');
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
        entry.validated
          ? 'bg-gray-100 text-red-600 hover:bg-gray-200'
          : 'bg-green-600 text-white hover:bg-green-700'
      } disabled:opacity-60`}
    >
      {busy ? '...' : entry.validated ? 'Annuler la validation' : 'Valider'}
    </button>
  );
}
