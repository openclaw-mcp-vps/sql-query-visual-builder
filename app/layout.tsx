import type { Metadata } from "next";

import { ToasterProvider } from "@/components/ToasterProvider";

import "@/app/globals.css";

const siteUrl = "https://sql-query-visual-builder.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "SQL Query Visual Builder",
    template: "%s | SQL Query Visual Builder"
  },
  description:
    "Build complex SQL queries with drag-and-drop, generate production-ready SQL instantly, and get optimization guidance in real time.",
  applicationName: "SQL Query Visual Builder",
  keywords: [
    "sql query builder",
    "visual sql",
    "database analytics",
    "sql generator",
    "non-technical sql"
  ],
  openGraph: {
    type: "website",
    url: siteUrl,
    title: "SQL Query Visual Builder",
    description:
      "Drag tables and fields, generate SQL live, and unblock product and analytics teams without writing syntax from scratch.",
    siteName: "SQL Query Visual Builder"
  },
  twitter: {
    card: "summary_large_image",
    title: "SQL Query Visual Builder",
    description:
      "Visual SQL builder for PMs and analysts. Build joins, filters, and sorted reports without SQL syntax friction."
  },
  robots: {
    index: true,
    follow: true
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        {children}
        <ToasterProvider />
      </body>
    </html>
  );
}
