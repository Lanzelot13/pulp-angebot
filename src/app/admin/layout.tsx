import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Admin | PULP angeBOT',
  description: 'Pulpmedia Angebots-Tool Administration',
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <link
        rel="preconnect"
        href="https://fonts.googleapis.com"
      />
      <link
        rel="preconnect"
        href="https://fonts.gstatic.com"
        crossOrigin="anonymous"
      />
      <link
        href="https://fonts.googleapis.com/css2?family=Anton&family=Roboto:wght@300;400;500;700;900&display=swap"
        rel="stylesheet"
      />
      <style
        dangerouslySetInnerHTML={{
          __html: `
            *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: 'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important; -webkit-font-smoothing: antialiased; }
          `,
        }}
      />
      {children}
    </>
  )
}
