import React from "react"
import type { WindowApp } from "../types"

interface TimelineAppProps {
  app: WindowApp
}

export function TimelineApp({ app }: TimelineAppProps) {
  const content = app.content as {
    education?: Array<{
      degree: string
      institution: string
      period: string
      description: string
    }>
    experiences?: Array<{
      position: string
      company: string
      period: string
      description: string
      technologies: string[]
    }>
  }

  return (
    <div className="text-primary-text">
      <div className="space-y-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-accent-cyan mb-2">Professional Timeline</h2>
          <p className="text-secondary-text">Education and work experience</p>
        </div>

        {/* Education */}
        <div>
          <h3 className="text-xl font-semibold text-accent-magenta border-b border-accent-magenta/30 pb-2 mb-6">
            🎓 Education
          </h3>
          <div className="space-y-6">
            {content.education?.map((edu, index) => (
              <div key={index} className="border-l-2 border-accent-cyan/50 pl-6 relative">
                <div className="absolute w-3 h-3 bg-accent-cyan rounded-full -left-[7px] top-1"></div>
                <div>
                  <h4 className="text-lg font-semibold text-primary-text">{edu.degree}</h4>
                  <p className="text-accent-cyan font-medium">{edu.institution}</p>
                  <p className="text-secondary-text text-sm mb-2 font-mono">{edu.period}</p>
                  <p className="text-secondary-text">{edu.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Experience */}
        <div>
          <h3 className="text-xl font-semibold text-accent-magenta border-b border-accent-magenta/30 pb-2 mb-6">
            💼 Professional Experience
          </h3>
          <div className="space-y-6">
            {content.experiences?.map((exp, index) => (
              <div key={index} className="border-l-2 border-accent-purple/50 pl-6 relative">
                <div className="absolute w-3 h-3 bg-accent-purple rounded-full -left-[7px] top-1"></div>
                <div>
                  <h4 className="text-lg font-semibold text-primary-text">{exp.position}</h4>
                  <p className="text-accent-purple font-medium">{exp.company}</p>
                  <p className="text-secondary-text text-sm mb-2 font-mono">{exp.period}</p>
                  <p className="text-secondary-text mb-3">{exp.description}</p>
                  <div className="flex flex-wrap gap-2">
                    {exp.technologies?.map((tech, techIndex) => (
                      <span
                        key={techIndex}
                        className="px-2 py-1 bg-accent-purple/20 text-accent-purple rounded text-xs font-mono"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}