"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Sun } from "lucide-react";

export function Navbar() {
  const pathname = usePathname();
  
  const navItems = [
    {
      name: "発電量取得",
      href: "/",
    },
    {
      name: "データだけ取得",
      href: "/data-only",
    },
    {
      name: "データ繰り返し取得",
      href: "/repeated-data",
    },
    {
      name: "JSONデータ結合",
      href: "/json-merge",
    },
    {
      name: "CSV化",
      href: "/csv",
    },
    {
      name: "一括CSV作成",
      href: "/batch-csv",
    },
    {
      name: "タイムスタンプ変換",
      href: "/timestamp",
    },
    {
      name: "リクエスト履歴",
      href: "/request-logs",
    },
    {
      name: "データベース",
      href: "/database",
    },
    {
      name: "設定",
      href: "/settings",
    },
  ];

  return (
    <div className="fixed left-0 top-0 h-full w-64 bg-lime-500 text-white shadow-lg z-50">
      <div className="p-4 border-b border-lime-600">
        <Link href="/" className="flex items-center space-x-2">
          <Sun className="h-6 w-6" />
          <span className="font-bold text-lg">発電量データ取得</span>
        </Link>
      </div>
      <nav className="p-4">
        <ul className="space-y-3">
          {navItems.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "block py-2 px-4 rounded-md transition-colors hover:bg-lime-600",
                  pathname === item.href
                    ? "bg-lime-600 font-semibold"
                    : "bg-transparent"
                )}
              >
                {item.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}