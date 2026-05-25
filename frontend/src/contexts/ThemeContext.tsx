import { createContext, useContext, useState, useMemo, useCallback } from 'react';

type Tema = 'dark' | 'light';

interface ThemeContextValue {
  tema: Tema;
  alternar: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({ tema: 'dark', alternar: () => {} });

function aplicarTema(t: Tema) {
  document.documentElement.classList.toggle('light', t === 'light');
  localStorage.setItem('tema', t);
  const meta = document.querySelector<HTMLMetaElement>('meta[name="color-scheme"]');
  if (meta) meta.content = t;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [tema, setTema] = useState<Tema>(() => {
    const salvo = (localStorage.getItem('tema') as Tema) ?? 'dark';
    // Aplica antes da primeira renderização — sem flash
    aplicarTema(salvo);
    return salvo;
  });

  const alternar = useCallback(() => {
    // Altera o DOM de forma SÍNCRONA — tudo muda no mesmo frame do browser
    const novoTema: Tema = document.documentElement.classList.contains('light') ? 'dark' : 'light';
    aplicarTema(novoTema);
    // Atualiza o estado React apenas para re-renderizar o ícone
    setTema(novoTema);
  }, []);

  const value = useMemo(() => ({ tema, alternar }), [tema, alternar]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
