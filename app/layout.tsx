import type { Metadata } from "next";
import type { ReactNode } from "react";

import { VaultProvider } from "@/store/vault-store";
import "./globals.css";

export const metadata: Metadata = {
  title: "Real Estate Vault — Property Intelligence",
  description:
    "Turns fragmented property documents into a structured, evidence-backed property record. Demo simulation.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-ink-950 text-ink-100 antialiased">
        <VaultProvider>{children}</VaultProvider>
      </body>
    </html>
  );
}
