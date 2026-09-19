import { useEffect, useState } from 'react';
import { CssTokenReader } from '@utils-style/CssTokenReader.js';

export function useCssTokens(names: readonly string[]): Record<string, string> {
  const [tokens, setTokens] = useState<Record<string, string>>(() => CssTokenReader.read(names));

  useEffect(() => {
    setTokens(CssTokenReader.read(names));
    const observer = new MutationObserver(() => setTokens(CssTokenReader.read(names)));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, [names]);

  return tokens;
}
