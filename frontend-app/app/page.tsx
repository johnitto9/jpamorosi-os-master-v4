import { Suspense, lazy } from 'react';

// Carga dinámica de ClientApp para asegurar que se renderiza solo en el cliente
const ClientApp = lazy(() => import('./client-app'));

export default function HomePage() {
  return (
    <Suspense fallback={<div className="h-screen w-screen bg-black flex items-center justify-center text-white">Cargando...</div>}>
      <ClientApp />
    </Suspense>
  );
}