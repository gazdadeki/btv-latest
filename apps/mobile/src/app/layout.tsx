import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import { PwaInstallListener } from "@/components/pwa-install-listener";
import "./globals.css";

export const metadata: Metadata = {
  title: "BaltazarTV",
  description: "BaltazarTV Player App",
  applicationName: "BaltazarTV",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    // "black" keeps content below an opaque dark status bar (matches the
    // #0f0e0c theme). "black-translucent" would overlay content under the
    // status bar, which the app's layouts don't pad for (no safe-area-inset-top).
    statusBarStyle: "black",
    title: "BaltazarTV",
  },
  formatDetection: { telephone: false, email: false, address: false },
  icons: {
    icon: [{ url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" }],
    shortcut: ["/favicon-32x32.png"],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0f0e0c",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css?family=Source+Sans+Pro:300,400,400i,700&display=fallback"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Orbitron:wght@600;700;800;900&display=swap"
        />
      </head>
      <body className="antialiased bg-gray-50 font-[Source_Sans_Pro,sans-serif]">
        {children}
        <PwaInstallListener />
        <Toaster
          richColors
          position="top-center"
          closeButton
          duration={3000}
          mobileOffset={16}
        />
      </body>
    </html>
  );
}
