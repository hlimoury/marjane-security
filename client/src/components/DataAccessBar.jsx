/* eslint-disable react-refresh/only-export-components */
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getInstance } from '../services/api';

export function useDataAccess(instanceId, category) {
  const { user } = useAuth();
  const [access, setAccess] = useState({
    loading: true,
    locked: false,
    message: '',
  });

  useEffect(() => {
    let ignore = false;
    getInstance(instanceId)
      .then((res) => {
        if (ignore) return;
        setAccess({ loading: false, locked: false, message: '' });
      })
      .catch(() => {
        if (!ignore) setAccess({ loading: false, locked: false, message: '' });
      });
    return () => { ignore = true; };
  }, [instanceId, category, user?.id]);

  return access;
}

export function DataAccessBar({ access }) {
  if (!access?.locked) return null;

  return (
    <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      {access.message}
    </div>
  );
}
