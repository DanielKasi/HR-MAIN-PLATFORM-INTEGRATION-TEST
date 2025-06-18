"use client";

import type * as React from "react";

export const Chart = ({children}: {children: React.ReactNode}) => {
  return <div className="w-full">{children}</div>;
};

export const ChartContainer = ({children}: {children: React.ReactNode}) => {
  return <div className="relative">{children}</div>;
};

export const ChartGrid = (
  // {x, y}:
  //  {x?: {show: boolean}; y?: {show: boolean}}
  ) => {
  return <></>;
};

export const ChartLine = (
//   {
//   data,
//   valueKey,
//   categoryKey,
//   strokeWidth,
//   style,
// }: {
//   data: any[];
//   valueKey: string;
//   categoryKey: string;
//   strokeWidth?: number;
//   style?: React.CSSProperties;
// }

) => {
  return <></>;
};

export const ChartBar = (
//   {
//   data,
//   valueKey,
//   categoryKey,
//   style,
// }: {
//   data: any[];
//   valueKey: string;
//   categoryKey: string;
//   style?: React.CSSProperties;
// }
) => {
  return <></>;
};

export const ChartPie = (
//   {
//   data,
//   valueKey,
//   categoryKey,
// }: {
//   data: any[];
//   valueKey: string;
//   categoryKey: string;
// }
) => {
  return <></>;
};

export const ChartXAxis = () => {
  return <></>;
};

export const ChartYAxis = () => {
  return <></>;
};

export const ChartTooltip = ({children}: {children: React.ReactNode}) => {
  return <>{children}</>;
};

export const ChartTooltipContent = () => {
  return <></>;
};

export const ChartLegend = () => {
  return <></>;
};
