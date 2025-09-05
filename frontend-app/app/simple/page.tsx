"use client"

export default function SimplePage() {
  console.log("SimplePage rendering...")
  
  return (
    <div style={{ 
      minHeight: '100vh',
      backgroundColor: '#000',
      color: '#fff',
      padding: '20px',
      fontFamily: 'Arial'
    }}>
      <h1 style={{ color: '#00ff00', fontSize: '24px' }}>🟢 SIMPLE PAGE WORKS!</h1>
      <p>If you see this, the basic setup is working.</p>
      
      <div style={{ 
        marginTop: '20px', 
        border: '1px solid #333', 
        padding: '15px',
        backgroundColor: '#111'
      }}>
        <h2 style={{ color: '#ff6b00' }}>Debug Info:</h2>
        <ul>
          <li>✅ Next.js: Working</li>
          <li>✅ React: Rendering</li>
          <li>✅ Client Component: Working</li>
        </ul>
      </div>
      
      <script dangerouslySetInnerHTML={{
        __html: `console.log("JavaScript is running!");`
      }} />
    </div>
  )
}