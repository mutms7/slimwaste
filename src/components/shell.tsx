"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Camera,
  ChartNoAxesColumnIncreasing,
  History,
  Settings2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { BrandMark } from "@/components/brand";

const links = [
  { href: "/scan", label: "Scan", Icon: Camera },
  { href: "/history", label: "History", Icon: History },
  { href: "/insights", label: "Insights", Icon: ChartNoAxesColumnIncreasing },
  { href: "/settings", label: "Settings", Icon: Settings2 },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="site-header">
        <Link href="/scan" className="wordmark" aria-label="SlimWaste home">
          <span className="brand-mark" aria-hidden="true">
            <BrandMark />
          </span>
          <span>
            slimwaste<span className="wordmark-dot">.</span>
          </span>
        </Link>
        <span className="header-note">
          Notice more.
          <br />
          Waste less.
        </span>
        <nav className="bottom-nav" aria-label="Main navigation">
          {links.map(({ href, label, Icon }) => {
            const active =
              href === "/scan"
                ? pathname === "/" || pathname.startsWith("/scan")
                : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={active ? "nav-link active" : "nav-link"}
                aria-current={active ? "page" : undefined}
              >
                <Icon size={22} strokeWidth={2} aria-hidden="true" />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>
      </header>
      {!online && (
        <div role="status" className="offline-banner">
          You’re offline. Saved pages may still be visible, but new scans and
          changes need a connection.
        </div>
      )}
      <main id="main" className="main-content">
        {children}
      </main>
    </div>
  );
}

export function PageIntro({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="page-intro">
      <div className="eyebrow">{eyebrow}</div>
      <h1>{title}</h1>
      {children && <p>{children}</p>}
    </div>
  );
}

export function Notice({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "warning" | "error";
}) {
  return (
    <div
      className={`notice notice-${tone}`}
      role={tone === "error" ? "alert" : "status"}
    >
      {children}
    </div>
  );
}
