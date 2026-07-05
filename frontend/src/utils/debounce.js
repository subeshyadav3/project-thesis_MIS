import { useState, useCallback } from 'react';

export function useDebounce(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  const [timer, setTimer] = useState(null);
  const setValue = useCallback((val) => {
    if (timer) clearTimeout(timer);
    const t = setTimeout(() => setDebounced(val), delay);
    setTimer(t);
  }, [delay]);
  return [debounced, setValue];
}

export function debounce(fn, delay = 300) {
  let timer = null;
  return (...args) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}
