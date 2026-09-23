


import React, { useEffect, useState } from 'react';
import { ThemeContext, type Theme } from "./themeContextValue";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    // Check localStorage first
    const savedTheme = localStorage.getItem('theme') as Theme;
    if (savedTheme) return savedTheme;
    
    // Check system preference
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    
    return 'default';
  });

  useEffect(() => {
    // Save to localStorage
    localStorage.setItem('theme', theme);

    // Remove all theme classes
    document.documentElement.classList.remove('theme-default', 'theme-light', 'theme-dark', 'dark');

    // Add current theme class
    document.documentElement.classList.add(`theme-${theme}`);
    
    // Add 'dark' class for Tailwind dark mode if theme is dark
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
