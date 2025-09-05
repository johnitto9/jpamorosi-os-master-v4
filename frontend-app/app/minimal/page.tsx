export default function MinimalPage() {
  return (
    <html>
      <body style={{ 
        margin: 0, 
        padding: '2rem', 
        backgroundColor: '#111', 
        color: '#fff',
        fontFamily: 'Arial, sans-serif'
      }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>🟢 MINIMAL PAGE WORKS</h1>
        <p>Si ves esto, React funciona pero algo más está fallando.</p>
        <ul>
          <li>✅ Next.js Server: OK</li>
          <li>✅ React Rendering: OK</li>
          <li>✅ Basic HTML/CSS: OK</li>
        </ul>
        <div style={{ marginTop: '2rem', border: '1px solid #333', padding: '1rem' }}>
          <h3>Next Steps:</h3>
          <p>El problema está en Tailwind CSS o algún componente específico.</p>
        </div>
      </body>
    </html>
  )
}