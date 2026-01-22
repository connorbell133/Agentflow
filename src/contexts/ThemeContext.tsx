"use client";
import React, { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // Initialize theme based on what the blocking script already set
  const [theme, setTheme] = useState<Theme>(() => {
    // Check if we're on the client
    if (typeof window !== 'undefined') {
      // First check if the blocking script stored the theme
      const storedTheme = (window as any).__theme;
      if (storedTheme) return storedTheme as Theme;
      
      // Fallback to checking the DOM
      return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    }
    return 'light';
  });

  useEffect(() => {
    // Sync with localStorage on mount
    const savedTheme = localStorage.getItem("theme") as Theme;
    if (savedTheme && savedTheme !== theme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle("dark", savedTheme === "dark");
    }
  }, [theme]);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    console.log("Toggling theme from", theme, "to", newTheme);
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    
    // Force remove and add class to ensure it works
    document.documentElement.classList.remove("dark", "light");
    if (newTheme === "dark") {
      document.documentElement.classList.add("dark");
    }
    
    console.log("Document classes:", document.documentElement.classList.toString());
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};