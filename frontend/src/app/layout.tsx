import "@/css/satoshi.css";
import "@/css/style.css";
import "flatpickr/dist/flatpickr.min.css";
import "jsvectormap/dist/jsvectormap.css";
import { Metadata } from "next";
import Providers from "@/components/Providers";

export const metadata: Metadata = {
  title: {
    template: "%s | Client Portal",
    default: "Client Portal",
  },
  description: "Access your documents, invoices, and account information securely.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
