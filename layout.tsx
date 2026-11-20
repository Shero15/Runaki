import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { AppShell } from "@/components/AppShell";

export const metadata: Metadata = {
  title: {
    default: "Meter Search & Field Team Registry | RUNAKI",
    template: "%s | RUNAKI",
  },
  description:
    "Kurdistan Electricity Distribution Directorate · PMO — Look up a meter from an account, or an account from a meter, and resolve field team sheets from the CSV registry.",
  authors: [{ name: "Eng.Shiraz N Sabri" }],
  creator: "Eng.Shiraz N Sabri",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" dir="ltr">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
