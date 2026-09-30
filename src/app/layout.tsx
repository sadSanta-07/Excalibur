import type { Metadata } from "next";
import "@fontsource/assistant/400.css";
import "@fontsource/assistant/600.css";
import "@fontsource/caveat/400.css";
import "@fontsource/caveat/700.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Excalibur · sketch & share",
  description: "A tiny canvas for big ideas.",
};

const themeInit = `(function(){try{var t=localStorage.getItem('excalibur:theme');if(!t)t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';document.documentElement.dataset.theme=t}catch(e){}})()`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body>{children}</body>
    </html>
  );
}