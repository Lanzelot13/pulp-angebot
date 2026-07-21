import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PULP angeBOT",
  description: "Pulpmedia Angebots-Tool",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body style={{ margin: 0, padding: 0 }}>
        {children}
      </body>
    </html>
  );
}
