import React from "react"
import Image from "next/image"
import type { WindowApp } from "../types"

interface AboutAppProps {
  app: WindowApp
}

export function AboutApp({ app }: AboutAppProps) {
  const content = app.content as {
    name: string
    title: string
    bio: string
    description?: string[]
    image_path?: string
    location: string
    languages: string[]
    interests: string[]
  }

  // Función para renderizar texto con markdown bold
  const renderTextWithBold = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g)
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        const boldText = part.slice(2, -2)
        return <strong key={index} className="font-medium text-gray-200">{boldText}</strong>
      }
      return part
    })
  }

  return (
    <div className="text-primary-text">
      <div className="space-y-6">
        {/* Header with Image */}
        <div className="flex flex-col md:flex-row gap-6 items-center">
          {/* Profile Image */}
          {content.image_path && (
            <div className="flex-shrink-0">
              <div className="relative w-32 h-32 rounded-full overflow-hidden border-2 border-accent-cyan/30">
                <Image
                  src={content.image_path}
                  alt={`${content.name} profile`}
                  fill
                  className="object-cover"
                  style={{ 
                    objectPosition: 'center 40%',
                    transform: 'scale(1.35)'
                  }}
                  priority
                />
              </div>
            </div>
          )}
          
          {/* Header Text */}
          <div className="text-center md:text-left flex-1">
            <h2 className="text-2xl font-bold text-accent-cyan mb-2">{content.name}</h2>
            <p className="text-accent-magenta font-mono">{content.title}</p>
            <p className="text-secondary-text text-sm mt-1">{content.location}</p>
          </div>
        </div>

        {/* Bio/Description */}
        <div>
          <h3 className="text-lg font-semibold text-accent-purple mb-3">About Me</h3>
          {content.description ? (
            <div className="space-y-4">
              {content.description.map((paragraph, index) => (
                <p key={index} className="text-secondary-text leading-relaxed">
                  {renderTextWithBold(paragraph)}
                </p>
              ))}
            </div>
          ) : (
            <p className="text-secondary-text leading-relaxed">
              {renderTextWithBold(content.bio)}
            </p>
          )}
        </div>

        {/* Languages */}
        <div>
          <h3 className="text-lg font-semibold text-accent-purple mb-3">Languages</h3>
          <div className="flex flex-wrap gap-2">
            {content.languages.map((lang, index) => (
              <span
                key={index}
                className="px-3 py-1 bg-accent-cyan/20 text-accent-cyan rounded-full text-sm"
              >
                {lang}
              </span>
            ))}
          </div>
        </div>

        {/* Interests */}
        <div>
          <h3 className="text-lg font-semibold text-accent-purple mb-3">Interests</h3>
          <div className="flex flex-wrap gap-2">
            {content.interests.map((interest, index) => (
              <span
                key={index}
                className="px-3 py-1 bg-accent-magenta/20 text-accent-magenta rounded-full text-sm"
              >
                {interest}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}