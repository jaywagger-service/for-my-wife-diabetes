import type { Metadata, Viewport } from "next";
import "./globals.css";
import { MigrationRunner } from "@/components/MigrationRunner";

export const metadata: Metadata = {
  title: "For my wife",
  description: "작게나마 도움이 되면 좋겠어",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "For my wife",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#faf7f1",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://cdn.jsdelivr.net" />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css"
        />
      </head>
      <body>
        <MigrationRunner />
        {children}
      </body>
    </html>
  );
}
