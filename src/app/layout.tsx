import type { Metadata } from "next";
import { getServerSession } from "next-auth/next";
import { Poppins } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import { AlbumAmbientProvider } from "@/components/AlbumAmbientProvider";
import { Providers } from "@/components/Providers";
import { authOptions } from "@/lib/auth";
import SiteFooter from "@/components/SiteFooter";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-poppins",
});
import DevHostCanonicalizer from "@/components/DevHostCanonicalizer";

export const metadata: Metadata = {
  title: "TuneHeadz - Music Discovery & AI Generation",
  description: "Discover music, generate AI tracks, and build playlists with TuneHeadz",
  icons: {
    icon: "/favicon.ico",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let session = null;
  try {
    session = await getServerSession(authOptions);
  } catch {
    // Misconfigured NEXTAUTH_SECRET / adapter issues should not white-screen the app
    session = null;
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning className={poppins.variable}>
        <DevHostCanonicalizer />
        <Providers session={session}>
          <AlbumAmbientProvider>
            <Header initialSession={session} />
            {children}
            <SiteFooter />
          </AlbumAmbientProvider>
        </Providers>
      </body>
    </html>
  );
}
