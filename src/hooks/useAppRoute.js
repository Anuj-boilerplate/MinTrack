import { useCallback, useEffect, useState } from 'react';

function readHash() {
  const hash = window.location.hash.slice(1);
  return hash || '/today';
}

export default function useAppRoute() {
  const [route, setRoute] = useState(readHash);

  useEffect(() => {
    const sync = () => setRoute(readHash());
    window.addEventListener('hashchange', sync);
    window.addEventListener('popstate', sync);
    if (!window.location.hash) window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#/today`);
    return () => {
      window.removeEventListener('hashchange', sync);
      window.removeEventListener('popstate', sync);
    };
  }, []);

  const navigate = useCallback((nextRoute, { replace = false } = {}) => {
    const nextHash = `#${nextRoute.startsWith('/') ? nextRoute : `/${nextRoute}`}`;
    if (window.location.hash === nextHash) return;
    if (replace) window.history.replaceState(null, '', nextHash);
    else window.history.pushState(null, '', nextHash);
    setRoute(nextRoute.startsWith('/') ? nextRoute : `/${nextRoute}`);
  }, []);

  return [route, navigate];
}
