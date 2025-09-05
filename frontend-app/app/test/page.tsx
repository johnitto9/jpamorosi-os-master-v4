export default function TestPage() {
  return (
    <div className="min-h-screen bg-black text-white p-8">
      <h1 className="text-4xl font-bold mb-4">🚀 Test Page - jpamorosi.os</h1>
      <div className="space-y-4">
        <p className="text-green-400">✅ Next.js está funcionando</p>
        <p className="text-blue-400">✅ React se está renderizando</p>
        <p className="text-purple-400">✅ Tailwind CSS está cargado</p>
        
        <div className="mt-8 p-4 border border-gray-400 rounded">
          <h2 className="text-xl font-semibold mb-2">Información del Sistema:</h2>
          <ul className="text-sm space-y-1">
            <li>• Date: {new Date().toISOString()}</li>
            <li>• User Agent: {typeof window !== 'undefined' ? window.navigator.userAgent : 'Server-side'}</li>
            <li>• URL: {typeof window !== 'undefined' ? window.location.href : 'Server-side'}</li>
          </ul>
        </div>

        <div className="mt-4">
          <a href="/" className="text-cyan-400 hover:underline">← Volver a Home</a>
        </div>
      </div>
    </div>
  )
}