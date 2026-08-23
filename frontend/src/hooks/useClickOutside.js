import { useEffect, useRef } from 'react';

export default function useClickOutside(ref, onClose, enabled = true, ignoreSelector = null) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!enabled) return undefined;
    const handler = (event) => {
      if (ignoreSelector && event.target.closest?.(ignoreSelector)) return;
      if (ref.current && !ref.current.contains(event.target)) onCloseRef.current();
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onCloseRef.current();
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [enabled, ignoreSelector, ref]);
}
