"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const NAV_ITEMS = [
  {
    href: "/tasks",
    label: "タスク",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
  },
  {
    href: "/time-blocking",
    label: "ブロック",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-6 h-6">
        <rect x="3" y="4" width="18" height="18" rx="2" strokeLinecap="round" strokeLinejoin="round" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 2v4M8 2v4M3 10h18" />
      </svg>
    ),
  },
  // center + placeholder
  null,
  {
    href: "/reflection",
    label: "振り返り",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
  },
  {
    href: "/stats",
    label: "統計",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
];

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pointer-events-none">
      <div className="w-full max-w-lg pointer-events-auto">
        {/* safe area 対応 */}
        <div className="bg-white/90 backdrop-blur-md border-t border-slate-200 px-2 pb-safe">
          <div className="flex items-center justify-around h-16">
            {NAV_ITEMS.map((item, i) => {
              if (!item) {
                // 中央の + ボタン
                return (
                  <button
                    key="add"
                    onClick={() => router.push("/tasks?new=1")}
                    className="flex items-center justify-center w-14 h-14 rounded-full bg-violet-600 shadow-lg shadow-violet-300 active:scale-95 transition-transform -mt-5"
                    aria-label="タスクを追加"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5} className="w-7 h-7">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
                    </svg>
                  </button>
                );
              }

              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-2xl transition-colors min-w-[60px] ${
                    isActive
                      ? "text-violet-600 bg-violet-50"
                      : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  {item.icon}
                  <span className={`text-[10px] font-semibold leading-none ${isActive ? "text-violet-600" : ""}`}>
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
