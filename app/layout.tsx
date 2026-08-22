import type { Metadata } from "next";
import { Anton, Geist, Instrument_Serif, Inter_Tight } from "next/font/google";
import { SessionHydrator } from "@/components/app/SessionHydrator";
import { JobsProvider } from "@/lib/store/jobs";
import { ProfileProvider } from "@/lib/store/profile";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

const instrument = Inter_Tight({
  variable: "--font-instrument",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
});

const serif = Instrument_Serif({
  variable: "--font-serif-italic",
  subsets: ["latin"],
  weight: "400",
  style: "italic",
});

const caption = Anton({
  variable: "--font-anton",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "Clipmuse — Make $10,000/month using AI clipping",
  description:
    "AI clipping turns long videos into short, viral clips automatically. No editing skills needed — start making money online today.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geist.variable} ${instrument.variable} ${serif.variable} ${caption.variable} h-full antialiased`}
    >
      <body className="grain min-h-full bg-canvas text-ink">
        <ProfileProvider>
          <JobsProvider>
            <SessionHydrator />
            {children}
          </JobsProvider>
        </ProfileProvider>
      </body>
    </html>
  );
}
