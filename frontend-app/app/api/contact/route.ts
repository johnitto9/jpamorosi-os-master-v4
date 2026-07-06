import { NextResponse } from 'next/server'
import { z } from 'zod'
import { rateLimited } from '@/lib/rate-limit'
import { notifyAdmin, sendEmail } from '@/lib/email/service'

// Contact form validation schema
const contactSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  subject: z.string().min(2).max(160).optional(),
  message: z.string().min(10, 'El mensaje debe tener al menos 10 caracteres'),
})

export async function POST(request: Request) {
  // anti-spam: 5 submissions / 10 min per IP
  const limited = await rateLimited(request, 'contact', 5, 10 * 60_000)
  if (limited) return limited

  try {
    const body = await request.json()
    
    // Validate request body
    const validationResult = contactSchema.safeParse(body)
    
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          ok: false, 
          error: 'Datos inválidos',
          details: validationResult.error.issues 
        },
        { status: 400 }
      )
    }

    const { name, email, subject, message } = validationResult.data

    const admin = await notifyAdmin('lead_received', {
      name,
      email,
      need: message,
      stage: 'contact_form',
      score: 70,
      sessionId: `contact-${Date.now()}`,
      adminUrl: new URL('/admin/leads', request.url).toString(),
    })
    const confirmation = await sendEmail({
      template: 'contact_confirmation',
      to: email,
      data: { name },
    })

    return NextResponse.json({
      ok: true,
      mode: 'email_service',
      subject: subject ?? 'Portfolio contact',
      adminSent: admin.ok,
      confirmationSent: confirmation.ok,
      confirmationSkipped: confirmation.skipped === true,
      message: 'Mensaje enviado correctamente',
    })

  } catch (error) {
    console.error('Contact API error:', error)
    
    return NextResponse.json(
      { 
        ok: false, 
        error: 'Error interno del servidor' 
      },
      { status: 500 }
    )
  }
}

// Handle preflight OPTIONS request for CORS
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
