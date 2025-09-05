import React from "react"
import type { WindowApp } from "../types"

interface SkillsAppProps {
  app: WindowApp
}

export function SkillsApp({ app }: SkillsAppProps) {
  const content = app.content as {
    categories: Array<{
      name: string
      skills: Array<{
        name: string
        level: number
      }>
    }>
  }

  return (
    <div className="text-primary-text">
      <div className="space-y-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-accent-cyan mb-2">Technical Skills</h2>
          <p className="text-secondary-text">My expertise and proficiency levels</p>
        </div>

        {content.categories.map((category, index) => (
          <div key={index} className="space-y-4">
            <h3 className="text-xl font-semibold text-accent-magenta border-b border-accent-magenta/30 pb-2">
              {category.name}
            </h3>
            <div className="grid gap-4">
              {category.skills.map((skill, skillIndex) => (
                <div key={skillIndex} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-primary-text font-medium">{skill.name}</span>
                    <span className="text-accent-cyan text-sm font-mono">{skill.level}%</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-accent-cyan to-accent-magenta h-2 rounded-full transition-all duration-1000 ease-out"
                      style={{ width: `${skill.level}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}