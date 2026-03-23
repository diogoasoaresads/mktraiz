"use client";

import { useState } from 'react';
import Sidebar from './Sidebar';
import { clsx } from 'clsx';
import { usePathname } from 'next/navigation';

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
    const [collapsed, setCollapsed] = useState(false);
    const pathname = usePathname();

    // Hide sidebar on login, partner portal and embed routes
    const isPublicPath = pathname === '/login' || pathname?.startsWith('/partner') || pathname?.includes('/embed');

    if (isPublicPath) {
        return (
            <div className="min-h-screen bg-slate-50">
                {children}
            </div>
        );
    }

    return (
        <div className="flex min-h-screen">
            <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
            <main
                className={clsx(
                    "flex-1 min-h-screen bg-slate-50 transition-all duration-300 ease-in-out",
                    collapsed ? "ml-20" : "ml-72"
                )}
            >
                {children}
            </main>
        </div>
    );
}
