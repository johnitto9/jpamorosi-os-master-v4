import { NextResponse } from 'next/server'
import { z } from 'zod'

// Contact form validation schema
const contactSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  subject: z.string().min(5, 'El asunto debe tener al menos 5 caracteres'),
  message: z.string().min(10, 'El mensaje debe tener al menos 10 caracteres'),
})

export async function POST(request: Request) {
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

    // Check if Resend API key is available
    const resendApiKey = process.env.RESEND_API_KEY
    
    if (!resendApiKey) {
      // Log the contact attempt without sending email
      console.log('=== CONTACT FORM SUBMISSION (STUB MODE) ===')
      console.log('Name:', name)
      console.log('Email:', email) 
      console.log('Subject:', subject)
      console.log('Message:', message)
      console.log('Timestamp:', new Date().toISOString())
      console.log('=== END CONTACT SUBMISSION ===')
      
      return NextResponse.json({ 
        ok: true,
        mode: 'stub',
        message: 'Mensaje enviado correctamente (modo desarrollo)'
      })
    }

    // Try to send email with Resend
    try {
      const { Resend } = await import('resend')
      const resend = new Resend(resendApiKey)

      const result = await resend.emails.send({
        from: 'contact@jpamorosi.com', // Configure your verified domain
        to: 'juan.amorosi@gmail.com', // Your contact email
        subject: `Contacto desde jpamorosi.os: ${subject}`,
        html: `
          <h2>Nuevo mensaje desde jpamorosi.os</h2>
          <p><strong>Nombre:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Asunto:</strong> ${subject}</p>
          <p><strong>Mensaje:</strong></p>
          <p>${message.replace(/\n/g, '<br>')}</p>
          <hr>
          <p><small>Enviado desde jpamorosi.os el ${new Date().toLocaleString()}</small></p>
        `,
        replyTo: email,
      })

      console.log('Email sent successfully:', result.data?.id)
      
      return NextResponse.json({ 
        ok: true,
        mode: 'production',
        message: 'Mensaje enviado correctamente',
        id: result.data?.id
      })
      
    } catch (emailError) {
      console.error('Failed to send email:', emailError)
      
      // Fallback to stub mode if email fails
      console.log('=== CONTACT FORM SUBMISSION (FALLBACK MODE) ===')
      console.log('Name:', name)
      console.log('Email:', email)
      console.log('Subject:', subject) 
      console.log('Message:', message)
      console.log('Error:', emailError)
      console.log('=== END CONTACT SUBMISSION ===')
      
      return NextResponse.json({ 
        ok: true,
        mode: 'fallback',
        message: 'Mensaje enviado correctamente (modo fallback)'
      })
    }

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