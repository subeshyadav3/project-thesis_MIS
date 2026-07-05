import { useEffect, useCallback } from 'react';

export function useUnsavedChanges(hasChanges) {
  const handler = useCallback((e) => {
    if (hasChanges) {
      e.preventDefault();
      e.returnValue = '';
    }
  }, [hasChanges]);

  useEffect(() => {
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [handler]);

  const confirmLeave = useCallback((message) => {
    if (hasChanges) {
      return window.confirm(message || 'You have unsaved changes. Are you sure you want to leave?');
    }
    return true;
  }, [hasChanges]);

  return { confirmLeave };
}

export default useUnsavedChanges;
