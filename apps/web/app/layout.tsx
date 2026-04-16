import "./globals.css";
import type { Metadata, Viewport } from "next";
import { AppProviders } from "@/components/providers/AppProviders";
import { ServiceWorkerRegistrar } from "@/components/providers/ServiceWorkerRegistrar";

export const metadata: Metadata = {
  title: "SoulChat",
  description: "Deep connections, one message at a time.",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "SoulChat" },
  icons: { icon: "/icon-192.svg", apple: "/icon-192.svg" }
};

export const viewport: Viewport = {
  themeColor: "#7c3aed",
  width: "device-width",
  initialScale: 1
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppProviders>
          <ServiceWorkerRegistrar />
          {children}
        </AppProviders>
      </body>
    </html>
  );
}
