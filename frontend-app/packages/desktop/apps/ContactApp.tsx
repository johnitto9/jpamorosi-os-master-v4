import React from "react"
import { useForm, ValidationError } from "@formspree/react"
import type { WindowApp } from "../types"

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
                <span className="text-accent-cyan">📧</span>
                <a 
                  href={`mailto:${content.email}`}
                  className="text-secondary-text hover:text-accent-cyan transition-colors"
                >
                  {content.email}
                </a>
              </div>
              
              <div className="flex items-center gap-3">
                <span className="text-accent-cyan">💼</span>
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
                <span className="text-accent-cyan">🐙</span>
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