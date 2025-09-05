import './globals.css'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-dark-bg text-primary-text h-screen w-screen overflow-hidden">
        <div className="flex flex-col h-full w-full">
          {children}
        </div>
      </body>
    </html>
  )
}