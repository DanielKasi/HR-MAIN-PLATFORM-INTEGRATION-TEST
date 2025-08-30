"use client";

import { useDocumentTitle } from "@/hooks/use-document-title";
import type React from "react";


export function PageLayout({children, title, className}: {children: React.ReactNode,title:string, className?:string}) {
  useDocumentTitle(title);
  return <div className={`p-4 rounded-xl bg-white border ${className}`}>{children}</div>;
}

export default PageLayout;
