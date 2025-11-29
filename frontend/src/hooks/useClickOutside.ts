import { useEffect, RefObject } from 'react';

/**
 * Hook that calls a handler when clicking outside of the referenced element(s)
 * @param refs - Single ref or array of refs to watch
 * @param handler - Callback function to call when clicking outside
 * @param enabled - Optional boolean to enable/disable the hook (default: true)
 */
export function useClickOutside<T extends HTMLElement = HTMLElement>(
  refs: RefObject<T> | RefObject<T>[],
  handler: () => void,
  enabled: boolean = true
): void {
  useEffect(() => {
    if (!enabled) return;

    function handleClickOutside(event: MouseEvent) {
      const refsArray = Array.isArray(refs) ? refs : [refs];
      
      // Check if click is outside all referenced elements
      const isOutside = refsArray.every(ref => {
        return ref.current && !ref.current.contains(event.target as Node);
      });
      
      if (isOutside) {
        handler();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [refs, handler, enabled]);
}

/**
 * Hook for managing multiple dropdowns with click outside behavior
 * Useful when you have multiple dropdowns that should close when clicking outside
 */
export function useDropdownClose(
  dropdowns: Array<{
    ref: RefObject<HTMLElement>;
    isOpen: boolean;
    close: () => void;
  }>
): void {
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      dropdowns.forEach(({ ref, isOpen, close }) => {
        if (isOpen && ref.current && !ref.current.contains(event.target as Node)) {
          close();
        }
      });
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdowns]);
}