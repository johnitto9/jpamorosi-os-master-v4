import { Suspense, lazy } from 'react';
import type { Metadata } from 'next';

// Preserved jpamorosi.os interactive CV experience.
// Moved from app/page.tsx during the Amorosi Labs foundation refactor.
// The client-app (OS desktop/dock/window system) is unchanged.
const ClientApp = lazy(() => import('../client-app'));

export const metadata: Metadata = {
  title: 'jpamorosi.os — Interactive CV',
  description:
    'The interactive "desktop OS" CV: windows, dock, and 3D avatar. The original jpamorosi.os experience.',
  alternates: { canonical: '/os' },
};

export default function OsPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen w-screen bg-black flex items-center justify-center text-white">
          Cargando...
        </div>
      }
    >
      <ClientApp />
    </Suspense>
  );
}
