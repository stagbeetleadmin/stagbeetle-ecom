import type { Metadata } from "next";
import { Playfair_Display, Hanken_Grotesk } from "next/font/google";
import { CartProvider } from "@/context/CartContext";
import { AuthProvider } from "@/context/AuthContext";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  weight: ["400", "600", "700"],
  display: "swap",
});

const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--font-hanken",
  weight: ["300", "400", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL('https://stagbeetle.co.in'),
  title: {
    default: "Stag Beetle - The Anatomy of Elegance | Luxury Indian Weaves",
    template: "%s | Stag Beetle"
  },
  description: "Modern luxury defined by architectural form, tailored in our Bengaluru atelier with hand-woven Indian textiles including Banarasi silk, Kashmir wool, and Jaipur handloom linen.",
  icons: {
    icon: "/favicon.ico",
  },
  keywords: ["Indian Luxury Weaves", "Stag Beetle", "Banarasi Silk Shirts", "Mysore Rosewood Accessories", "Kashmir Wool Coat", "Jaipur Handloom Linen Trousers", "Bengaluru Atelier", "Premium Men Tailoring India"],
  authors: [{ name: "Stag Beetle Atelier" }],
  creator: "Stag Beetle Development Team",
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "https://stagbeetle.co.in",
    siteName: "Stag Beetle",
    title: "Stag Beetle | The Anatomy of Elegance",
    description: "Modern luxury defined by architectural form and hand-crafted precision using raw organic Indian textiles.",
    images: [
      {
        url: "https://lh3.googleusercontent.com/aida/ADBb0ujFqGREaXGbZqXPiWZTGXRJaf0kINJx3qPJYP40zlBqBhncUNgCM3pNCDoacB_0zqZJWMC3EmsbEWq0ab9Z4i-VT4EdSuXp7mmrgfFQi0ZuT-dhB9cm3WPyTNKTFzXVsnk8by8m8O-Dy0r5iZk3_ojV7lPukEqqKPGqG6ebpPy3lLAg3Odnd4VepJimWhQPGDHcshqfLo7UF1mawnG3bxSFUkGqTaKx8tzW288dlSi3lhJgZRaJHHsH",
        width: 1200,
        height: 630,
        alt: "Stag Beetle Luxury Collection"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "Stag Beetle | The Anatomy of Elegance",
    description: "Modern luxury defined by architectural form and hand-crafted organic weaves.",
    images: ["https://lh3.googleusercontent.com/aida/ADBb0ujFqGREaXGbZqXPiWZTGXRJaf0kINJx3qPJYP40zlBqBhncUNgCM3pNCDoacB_0zqZJWMC3EmsbEWq0ab9Z4i-VT4EdSuXp7mmrgfFQi0ZuT-dhB9cm3WPyTNKTFzXVsnk8by8m8O-Dy0r5iZk3_ojV7lPukEqqKPGqG6ebpPy3lLAg3Odnd4VepJimWhQPGDHcshqfLo7UF1mawnG3bxSFUkGqTaKx8tzW288dlSi3lhJgZRaJHHsH"]
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    }
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${playfair.variable} ${hanken.variable} h-full antialiased`}
    >
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col font-body bg-surface text-on-surface">
        <AuthProvider>
          <CartProvider>
            {children}
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
