import React, { createContext, useContext, useState } from 'react';

type FontSize = 'small' | 'medium' | 'large';
type UnitSystem = 'metric' | 'imperial';

type ThemeContextType = {
  darkMode: boolean;
  setDarkMode: (v: boolean) => void;
  fontSize: FontSize;
  setFontSize: (v: FontSize) => void;
  unitSystem: UnitSystem;
  setUnitSystem: (v: UnitSystem) => void;
};

const ThemeContext = createContext<ThemeContextType>({
  darkMode: false,
  setDarkMode: () => {},
  fontSize: 'medium',
  setFontSize: () => {},
  unitSystem: 'metric',
  setUnitSystem: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [darkMode, setDarkMode] = useState(false);
  const [fontSize, setFontSize] = useState<FontSize>('medium');
  const [unitSystem, setUnitSystem] = useState<UnitSystem>('metric');

  return (
    <ThemeContext.Provider value={{ darkMode, setDarkMode, fontSize, setFontSize, unitSystem, setUnitSystem }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}