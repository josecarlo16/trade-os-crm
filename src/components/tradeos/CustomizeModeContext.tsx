import { createContext, useContext, useState, ReactNode } from 'react';

interface CustomizeModeCtx {
  isCustomizing: boolean;
  toggle: () => void;
}

const Ctx = createContext<CustomizeModeCtx | null>(null);

export function CustomizeModeProvider({ children }: { children: ReactNode }) {
  const [isCustomizing, setIsCustomizing] = useState(false);
  return <Ctx.Provider value={{ isCustomizing, toggle: () => setIsCustomizing((v) => !v) }}>{children}</Ctx.Provider>;
}

export function useCustomizeMode() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useCustomizeMode must be used within CustomizeModeProvider');
  return ctx;
}
