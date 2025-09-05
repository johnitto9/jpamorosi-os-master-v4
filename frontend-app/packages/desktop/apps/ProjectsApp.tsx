import React from "react"
import Image from "next/image"
import type { WindowApp } from "../types"

interface ProjectsAppProps {
  app: WindowApp
}

export function ProjectsApp({ app }: ProjectsAppProps) {
  const content = app.content as {
    featured: Array<{
      name: string
      description: string
      technologies: string[]
      status: string
      imageUrl?: string | null
      theme?: string
      demo?: string
      github?: string
    }>
  }

  return (
    <div className="p-6 text-primary-text h-full overflow-auto">
      <div className="space-y-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-accent-cyan mb-2">Featured Projects</h2>
          <p className="text-secondary-text">A showcase of my recent work</p>
        </div>

        <div className="grid gap-6">
          {content.featured.map((project, index) => (
            <div
              key={index}
              className="glass-card p-6 rounded-lg border border-accent-cyan/20 hover:border-accent-cyan/40 transition-all duration-300"
            >
              {/* Project Image */}
              {project.imageUrl && (
                <div className="relative w-full h-48 mb-4 rounded-lg overflow-hidden bg-gray-800">
                  <Image
                    src={project.imageUrl}
                    alt={`${project.name} preview`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    onError={(e) => {
                      console.log('Image failed to load:', project.imageUrl);
                    }}
                  />
                </div>
              )}
              
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-xl font-semibold text-accent-cyan">{project.name}</h3>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    project.status === "Production" || project.status === "Active"
                      ? "bg-green-500/20 text-green-400"
                      : project.status === "In Development"
                      ? "bg-yellow-500/20 text-yellow-400"
                      : project.status === "Completed"
                      ? "bg-blue-500/20 text-blue-400"
                      : "bg-gray-500/20 text-gray-400"
                  }`}
                >
                  {project.status}
                </span>
              </div>
              
              <p className="text-secondary-text mb-4 leading-relaxed">
                {project.description}
              </p>
              
              <div className="flex flex-wrap gap-2 mb-4">
                {project.technologies.map((tech, techIndex) => (
                  <span
                    key={techIndex}
                    className="px-2 py-1 bg-accent-magenta/20 text-accent-magenta rounded text-sm font-mono"
                  >
                    {tech}
                  </span>
                ))}
              </div>
              
              <div className="flex gap-3 pt-2">
                {project.demo && (
                  <button
                    onClick={() => window.open(project.demo, "_blank")}
                    className="px-4 py-2 bg-accent-cyan/20 text-accent-cyan rounded hover:bg-accent-cyan/30 transition-colors text-sm font-medium focus-ring"
                  >
                    🚀 Live Demo
                  </button>
                )}
                {project.github && (
                  <button
                    onClick={() => window.open(project.github, "_blank")}
                    className="px-4 py-2 bg-accent-purple/20 text-accent-purple rounded hover:bg-accent-purple/30 transition-colors text-sm font-medium focus-ring"
                  >
                    📂 GitHub
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}