import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

const SETTINGS_KEY = 'floodsense_settings';

const FONT_SIZES: FontSize[] = ['small', 'medium', 'large'];
const UNIT_SYSTEMS: UnitSystem[] = ['metric', 'imperial'];

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [darkMode, setDarkMode] = useState(false);
  const [fontSize, setFontSize] = useState<FontSize>('medium');
  const [unitSystem, setUnitSystem] = useState<UnitSystem>('metric');
  const [loaded, setLoaded] = useState(false);

  // Restore the resident's saved settings once at startup.
  useEffect(() => {
    AsyncStorage.getItem(SETTINGS_KEY)
      .then((raw) => {
        if (!raw) return;
        const saved = JSON.parse(raw);
        if (typeof saved.darkMode === 'boolean') setDarkMode(saved.darkMode);
        if (FONT_SIZES.includes(saved.fontSize)) setFontSize(saved.fontSize);
        if (UNIT_SYSTEMS.includes(saved.unitSystem)) setUnitSystem(saved.unitSystem);
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  // Save on every change, but only after loading so defaults never overwrite what was saved.
  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify({ darkMode, fontSize, unitSystem })).catch(() => {});
  }, [loaded, darkMode, fontSize, unitSystem]);

  return (
    <ThemeContext.Provider value={{ darkMode, setDarkMode, fontSize, setFontSize, unitSystem, setUnitSystem }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
