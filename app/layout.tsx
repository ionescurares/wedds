import type { Metadata } from "next";
import "./globals.css";

const GOOGLE_FONTS_URL =
  "https://fonts.googleapis.com/css2?" +
  [
    "family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400;1,500;1,600",
    "family=Dancing+Script:wght@400;700",
    "family=EB+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400",
    "family=Great+Vibes",
    "family=Josefin+Sans:wght@300;400;500",
    "family=Libre+Baskerville:ital,wght@0,400;0,700;1,400",
    "family=Lora:ital,wght@0,400;0,500;0,600;0,700;1,400",
    "family=Montserrat:wght@300;400;500;600;700",
    "family=Outfit:wght@300;400;500",
    "family=Playfair+Display:wght@400;500;600;700",
    "family=Raleway:wght@300;400;500;600",
    "family=Source+Serif+4:wght@300;400;500;600",
    "display=swap",
  ].join("&");

export const metadata: Metadata = {
  title: "Spunem Da - Wedding Invitation Builder",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href={GOOGLE_FONTS_URL} rel="stylesheet" />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
