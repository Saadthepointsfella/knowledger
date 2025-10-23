import "./globals.css";
import { Press_Start_2P } from "next/font/google";

const pressStart = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${pressStart.className} bg-[#F5F5DC] text-neutral-900`}>
        <div className="max-w-7xl mx-auto p-4">{children}</div>
      </body>
    </html>
  );
}
