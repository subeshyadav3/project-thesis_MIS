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
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [enabled, ignoreSelector, ref]);
}
