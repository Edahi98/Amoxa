import { useContext } from 'react';
import { ScreenRuntimeContext, type ScreenRuntimeValue } from '@contexts/ScreenRuntimeContext.js';

export function useScreenRuntime(): ScreenRuntimeValue {
  const runtime = useContext(ScreenRuntimeContext);
  if (!runtime) {
    throw new Error('useScreenRuntime debe usarse dentro de un ScreenRuntimeProvider');
  }
  return runtime;
}
