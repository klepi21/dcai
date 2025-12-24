'use client';
import {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react';

interface DcaBoardThemeContextValue {
  isDark: boolean;
  toggle: () => void;
}

const DcaBoardThemeContext = createContext<DcaBoardThemeContextValue | undefined>(
  undefined
);

export const DcaBoardThemeProvider = ({ children }: PropsWithChildren) => {
  const [isDark, setIsDark] = useState(false);

  // Apply .dark class to the root html element so the whole layout (nav, footer, etc.) follows.
  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [isDark]);

  const value = useMemo(
    () => ({
      isDark,
      toggle: () => setIsDark((prev) => !prev)
    }),
    [isDark]
  );

  return (
    <DcaBoardThemeContext.Provider value={value}>
      {children}
    </DcaBoardThemeContext.Provider>
  );
};

export const useDcaBoardTheme = (): DcaBoardThemeContextValue => {
  const context = useContext(DcaBoardThemeContext);

  if (!context) {
    throw new Error('useDcaBoardTheme must be used within DcaBoardThemeProvider');
  }

  return context;
};


