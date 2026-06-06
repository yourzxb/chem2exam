import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Chem2Exam 化学学习诊断",
  description: "用中高考真题诊断学生化学知识断点，并通过知识图谱给出补救路径。"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
