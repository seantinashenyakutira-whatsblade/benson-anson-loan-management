'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { ApplyModal } from './apply-modal';

interface ApplyContextValue {
  open: () => void;
}

const ApplyContext = createContext<ApplyContextValue>({ open: () => undefined });

export function useApply(): ApplyContextValue {
  return useContext(ApplyContext);
}

/** Provides the "Apply Now" modal to any descendant button/CTA. */
export function ApplyProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const value = useMemo(() => ({ open }), [open]);

  return (
    <ApplyContext.Provider value={value}>
      {children}
      <ApplyModal isOpen={isOpen} onClose={close} />
    </ApplyContext.Provider>
  );
}