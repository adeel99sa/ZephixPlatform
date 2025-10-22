import { lazy } from 'react';
export function lazyDefault<T extends React.ComponentType<any>>(p: () => Promise<{ default: T }>) {
  return lazy(async () => {
    const mod = await p();
    if (!mod?.default) throw new Error('Lazy module has no default export');
    return mod;
  });
}