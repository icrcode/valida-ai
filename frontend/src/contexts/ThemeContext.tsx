import { createContext, useContext, useState, useEffect } from 'react';

type Tema = 'dark' | 'light';

interface ThemeContextValue {
  tema: Tema;
  alternar: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({ tema: 'dark', alternar: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [tema, setTema] = useState<Tema>(() => {
    const salvo = (localStorage.getItem('tema') as Tema) ?? 'dark';
    // Aplica a classe antes da primeira renderização para evitar flash
    document.documentElement.classList.toggle('light', salvo === 'light');
    return salvo;
  });

  useEffect(() => {
    document.documentElement.classList.toggle('light', tema === 'light');
    localStorage.setItem('tema', tema);
    const meta = document.querySelector<HTMLMetaElement>('meta[name="color-scheme"]');
    if (meta) meta.content = tema === 'light' ? 'light' : 'dark';
  }, [tema]);

  return (
    <ThemeContext.Provider value={{ tema, alternar: () => setTema((t) => (t === 'dark' ? 'light' : 'dark')) }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
