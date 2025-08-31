"use client";

import type * as React from "react";

// ChartContainer
interface ChartContainerProps {
  children: React.ReactNode;
  className?: string;
  config?: Record<string, { label: string; color: string }>;
}

export const ChartContainer = ({ children, className, config }: ChartContainerProps) => {
  // you can even inject config into CSS variables here if needed
  return <div className={`relative ${className ?? ""}`}>{children}</div>;
};

// ChartTooltip
interface ChartTooltipProps {
  children?: React.ReactNode;
  content?: React.ReactNode;
}

export const ChartTooltip = ({ children, content }: ChartTooltipProps) => {
  return <>{content ?? children}</>;
};

// ChartTooltipContent
export const ChartTooltipContent = () => {
  return <div className="p-2 text-sm text-muted-foreground">Tooltip</div>;
};
