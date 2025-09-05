"use client"

// Static CSS fallback for when 3D is disabled
export function FallbackBackground() {
  return (
    <div className="absolute inset-0 -z-10">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-accent-cyan/10 via-transparent to-accent-magenta/10" />
      
      {/* Radial glow effect */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(0,242,255,0.08),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(255,0,128,0.06),transparent_50%)]" />
      
      {/* Subtle animated dots with CSS */}
      <div className="absolute inset-0 opacity-20">
        <div 
          className="absolute w-1 h-1 bg-accent-cyan rounded-full animate-pulse"
          style={{ top: '20%', left: '10%', animationDelay: '0s' }}
        />
        <div 
          className="absolute w-1 h-1 bg-accent-magenta rounded-full animate-pulse"
          style={{ top: '40%', left: '80%', animationDelay: '2s' }}
        />
        <div 
          className="absolute w-1 h-1 bg-accent-purple rounded-full animate-pulse"
          style={{ top: '70%', left: '30%', animationDelay: '4s' }}
        />
        <div 
          className="absolute w-1 h-1 bg-accent-cyan rounded-full animate-pulse"
          style={{ top: '80%', left: '90%', animationDelay: '1s' }}
        />
        <div 
          className="absolute w-1 h-1 bg-accent-magenta rounded-full animate-pulse"
          style={{ top: '30%', left: '60%', animationDelay: '3s' }}
        />
      </div>
    </div>
  )
}

export default FallbackBackground