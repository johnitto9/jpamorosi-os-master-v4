import React from "react"
import { useForm, ValidationError } from "@formspree/react"
import type { WindowApp } from "../types"

// Social Media Icons Components
const EmailIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
    <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.89 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
  </svg>
)

const LinkedInIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
  </svg>
)

const GitHubIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
  </svg>
)

interface ContactAppProps {
  app: WindowApp
}

export function ContactApp({ app }: ContactAppProps) {
  const [state, handleSubmit] = useForm("xanbvlqw")

  const content = app.content as {
    email: string
    linkedin: string
    github: string
    availability: string
    timezone: string
    languages: string[]
  }

  return (
    <div className="text-primary-text">
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-accent-cyan mb-2">Contact</h2>
          <p className="text-secondary-text">Let's connect and work together</p>
        </div>

        {/* Contact Info */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-accent-magenta">Contact Information</h3>
            
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <EmailIcon className="text-accent-cyan" />
                <a 
                  href={`mailto:${content.email}`}
                  className="text-secondary-text hover:text-accent-cyan transition-colors"
                >
                  {content.email}
                </a>
              </div>
              
              <div className="flex items-center gap-3">
                <LinkedInIcon className="text-accent-cyan hover:text-[#0077B5] transition-colors" />
                <a 
                  href={content.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-secondary-text hover:text-accent-cyan transition-colors"
                >
                  LinkedIn Profile
                </a>
              </div>
              
              <div className="flex items-center gap-3">
                <GitHubIcon className="text-accent-cyan hover:text-white transition-colors" />
                <a 
                  href={content.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-secondary-text hover:text-accent-cyan transition-colors"
                >
                  GitHub Profile
                </a>
              </div>
            </div>

            <div className="space-y-2 pt-4">
              <p className="text-sm text-secondary-text">
                <span className="text-accent-purple font-medium">Availability:</span> {content.availability}
              </p>
              <p className="text-sm text-secondary-text">
                <span className="text-accent-purple font-medium">Timezone:</span> {content.timezone}
              </p>
            </div>
          </div>

          {/* Contact Form */}
          <div>
            <h3 className="text-lg font-semibold text-accent-magenta mb-4">Send a Message</h3>
            
            {state.succeeded ? (
              <div className="text-center py-4">
                <div className="text-3xl mb-2">✅</div>
                <h4 className="text-lg font-semibold text-accent-cyan mb-1">Message Sent!</h4>
                <p className="text-secondary-text text-sm">Thank you for reaching out. I'll get back to you soon.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-primary-text mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    required
                    className="w-full px-3 py-2 bg-white/10 border border-accent-cyan/30 rounded focus:outline-none focus:border-accent-cyan text-primary-text placeholder-secondary-text text-sm"
                    placeholder="Your name"
                  />
                  <ValidationError 
                    prefix="Name" 
                    field="name"
                    errors={state.errors}
                    className="text-red-400 text-xs mt-1"
                  />
                </div>
                
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-primary-text mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    className="w-full px-3 py-2 bg-white/10 border border-accent-cyan/30 rounded focus:outline-none focus:border-accent-cyan text-primary-text placeholder-secondary-text text-sm"
                    placeholder="your.email@example.com"
                  />
                  <ValidationError 
                    prefix="Email" 
                    field="email"
                    errors={state.errors}
                    className="text-red-400 text-xs mt-1"
                  />
                </div>
                
                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-primary-text mb-1">
                    Message
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    required
                    rows={3}
                    className="w-full px-3 py-2 bg-white/10 border border-accent-cyan/30 rounded focus:outline-none focus:border-accent-cyan text-primary-text placeholder-secondary-text resize-none text-sm"
                    placeholder="Your message here..."
                  />
                  <ValidationError 
                    prefix="Message" 
                    field="message"
                    errors={state.errors}
                    className="text-red-400 text-xs mt-1"
                  />
                </div>
                
                <button
                  type="submit"
                  disabled={state.submitting}
                  className="w-full px-4 py-2 bg-accent-cyan/20 text-accent-cyan rounded hover:bg-accent-cyan/30 transition-colors font-medium focus-ring disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {state.submitting ? "Sending..." : "Send Message"}
                </button>
                
                {/* General form errors */}
                <ValidationError 
                  errors={state.errors}
                  className="text-red-400 text-xs"
                />
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}