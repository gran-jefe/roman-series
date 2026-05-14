"use client";

import { useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AuthContext } from "@/context/AuthContext";
import { Navbar } from "./Navbar";

const PUBLIC_ROUTES = ["/", "/login", "/register", "/onboarding"];

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useContext(AuthContext) || {};
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || loading) {
    return <>{children}</>;
  }

  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);
  const shouldShowNavbar = isAuthenticated && !isPublicRoute;

  return (
    <>
      {shouldShowNavbar && <Navbar />}
      <div className={shouldShowNavbar ? "pt-16" : ""}>
        {children}
      </div>
    </>
  );
}
