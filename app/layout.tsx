import type { Metadata } from "next";
import { Anton, Inter, Schibsted_Grotesk } from "next/font/google";
import { SessionHydrator } from "@/components/app/SessionHydrator";
import { JobsProvider } from "@/lib/store/jobs";
import { ProfileProvider } from "@/lib/store/profile";
import "./globals.css";

/* Inter for everything you read, a tight grotesque for everything you notice. */
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const grotesk = Schibsted_Grotesk({
  variable: "--font-grotesk",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

/* Unchanged: this is the face burnt into the clips themselves. */
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
      className={`${inter.variable} ${grotesk.variable} ${caption.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-canvas text-ink">
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
