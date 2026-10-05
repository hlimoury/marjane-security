/* eslint-disable react-refresh/only-export-components */
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import { getInstance, validateAgentNotification } from '../services/api';

export function useDataAccess(instanceId, category) {
  const { user, isAgent } = useAuth();
  const [access, setAccess] = useState({
    loading: true,
    locked: isAgent(),
    message: isAgent() ? 'Vérification des droits...' : '',
  });

  useEffect(() => {
    let ignore = false;
    getInstance(instanceId)
      .then((res) => {
        if (ignore) return;
        const data = res.data;
        const sealed = (data.sealed_categories || []).includes(category);
        const ownsMonth = Number(data.created_by) === Number(user?.id);
        const locked = isAgent() && (!ownsMonth || sealed);
        setAccess({
          loading: false,
          locked,
          message: !isAgent()
            ? ''
            : sealed
              ? 'Ces données ont été validées par la région. Vous ne pouvez plus les modifier.'
              : ownsMonth
                ? ''
                : 'Ce mois a été créé par un autre compte. Vous pouvez seulement saisir les mois que vous créez.',
        });
      })
      .catch(() => {
        if (!ignore) setAccess({ loading: false, locked: isAgent(), message: 'Impossible de vérifier les droits.' });
      });
    return () => { ignore = true; };
  }, [instanceId, category, user?.id]);

  return access;
}

export function DataAccessBar({ access }) {
  const { isRegion } = useAuth();
  const [params] = useSearchParams();
  const noticeId = params.get('valider');
  const [done, setDone] = useState(false);
  const [validating, setValidating] = useState(false);

  const validate = async () => {
    try {
      setValidating(true);
      await validateAgentNotification(noticeId);
      setDone(true);
      toast.success('Validé. Le compte agent ne peut plus modifier cet élément.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erreur de validation');
    } finally {
      setValidating(false);
    }
  };

  if (!access.locked && !(isRegion() && noticeId)) return null;

  return (
    <div className="mb-4 space-y-3">
      {access.locked && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {access.message}
        </div>
      )}
      {isRegion() && noticeId && !done && (
        <button
          type="button"
          onClick={validate}
          disabled={validating}
          className="bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          {validating ? 'Validation...' : 'Valider et sceller'}
        </button>
      )}
      {done && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          Élément validé et scellé pour le compte agent.
        </div>
      )}
    </div>
  );
}
