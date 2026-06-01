import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "./providers/AuthProvider";
import ThemeProvider from "./components/ThemeProvider";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "Cinema Vagtplan",
  description: "Vagtplan og medarbejderportal til biografer",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Vagtplan",
    statusBarStyle: "black",
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="da" suppressHydrationWarning className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-gray-100 text-gray-900 transition-colors dark:bg-gray-950 dark:text-gray-100">
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
        <Toaster position="top-right" richColors closeButton duration={4000} />
      </body>
    </html>
  );
}
