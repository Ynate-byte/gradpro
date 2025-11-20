import React, { createContext, useContext, useEffect, useState } from "react"

const initialState = {
  theme: "system",
  setTheme: () => null,
  fontSize: "normal",
  setFontSize: () => null,
  reduceMotion: false,
  setReduceMotion: () => null,
}

const ThemeProviderContext = createContext(initialState)

export function ThemeProvider({
  children,
  defaultTheme = "system",
  defaultFontSize = "normal",
  defaultReduceMotion = false,
  storageKey = "vite-ui-theme",
  ...props
}) {
  const [theme, setTheme] = useState(
    () => localStorage.getItem(storageKey) || defaultTheme
  )

  const [fontSize, setFontSize] = useState(
    () => localStorage.getItem(`${storageKey}-font`) || defaultFontSize
  )

  const [reduceMotion, setReduceMotion] = useState(
    () => localStorage.getItem(`${storageKey}-motion`) === 'true'
  )

  useEffect(() => {
    const root = window.document.documentElement

    root.classList.remove("light", "dark")

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      root.classList.add(systemTheme)
      return
    }

    root.classList.add(theme)
  }, [theme])

  useEffect(() => {
    const root = window.document.documentElement;
    const sizes = {
        'extra-small': '12px',
        small: '14px',
        normal: '16px',
        large: '18px',
        xl: '20px'
    };
    root.style.fontSize = sizes[fontSize] || '16px';
  }, [fontSize]);

  useEffect(() => {
    const root = window.document.documentElement;
    if (reduceMotion) {
        root.classList.add('reduce-motion');
    } else {
        root.classList.remove('reduce-motion');
    }
  }, [reduceMotion]);

  const value = {
    theme,
    setTheme: (theme) => {
      localStorage.setItem(storageKey, theme)
      setTheme(theme)
    },
    fontSize,
    setFontSize: (size) => {
        localStorage.setItem(`${storageKey}-font`, size)
        setFontSize(size)
    },
    reduceMotion,
    setReduceMotion: (isReduced) => {
        localStorage.setItem(`${storageKey}-motion`, String(isReduced))
        setReduceMotion(isReduced)
    }
  }

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext)

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider")

  return context
}