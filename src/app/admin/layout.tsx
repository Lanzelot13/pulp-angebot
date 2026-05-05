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
  return children
}
