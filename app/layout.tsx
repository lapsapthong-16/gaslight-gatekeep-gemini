import type { Metadata } from "next";
import { Inter, Rajdhani, Orbitron } from "next/font/google"; // Import the fonts
import "./globals.css";

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const rajdhani = Rajdhani({ 
  weight: ['500', '600', '700'], 
  subsets: ['latin'], 
  variable: '--font-rajdhani' 
});
const orbitron = Orbitron({
    weight: ['700', '900'],
    subsets: ['latin'],
    variable: '--font-orbitron'
})

export const metadata: Metadata = {
  title: "Corporate Kombat",
  description: "A Visual Novel in the Boardroom",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${rajdhani.variable} ${orbitron.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
