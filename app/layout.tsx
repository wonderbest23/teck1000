import type { Metadata } from "next";
import "./globals.css";
import { AppHeader } from "@/components/AppHeader";
import { MobileBottomNav } from "@/components/MobileBottomNav";

export const metadata: Metadata = {
  title: "동방씽크 | 맞춤 인테리어 10초 미리보기",
  description: "동방씽크 맞춤 인테리어 제작. 3D 미리보기와 즉시 견적서를 한 번에.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>
        <AppHeader />
        {children}
        <MobileBottomNav />
      </body>
    </html>
  );
}
