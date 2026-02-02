import { useState, useEffect } from "react";
import { AppProviders } from "./providers";
import { MapPage } from "../pages/MapPage";
import { RouteEditorPage } from "../pages/RouteEditorPage";

function useHashRoute() {
  const [hash, setHash] = useState(window.location.hash);

  useEffect(() => {
    const handleHashChange = () => setHash(window.location.hash);
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  return hash;
}

export function App() {
  const hash = useHashRoute();
  const isEditor = hash === "#editor";

  return (
    <AppProviders>
      {isEditor ? <RouteEditorPage /> : <MapPage />}
    </AppProviders>
  );
}