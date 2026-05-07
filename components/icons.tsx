import type { SVGProps } from "react";

type Props = SVGProps<SVGSVGElement>;

const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export const Icon = {
  ArrowRight: (p: Props) => (
    <svg viewBox="0 0 16 16" {...base} {...p}><path d="M3 8h10M9 4l4 4-4 4"/></svg>
  ),
  ArrowLeft: (p: Props) => (
    <svg viewBox="0 0 16 16" {...base} {...p}><path d="M13 8H3m4-4L3 8l4 4"/></svg>
  ),
  Check: (p: Props) => (
    <svg viewBox="0 0 16 16" {...base} strokeWidth={1.75} {...p}><path d="M3 8.5l3.5 3.5L13 5"/></svg>
  ),
  CheckCircle: (p: Props) => (
    <svg viewBox="0 0 24 24" {...base} strokeWidth={1.6} {...p}><circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.5 2.5L16 9.5"/></svg>
  ),
  Upload: (p: Props) => (
    <svg viewBox="0 0 16 16" {...base} {...p}><path d="M8 11V3m-3 3l3-3 3 3M3 13h10"/></svg>
  ),
  File: (p: Props) => (
    <svg viewBox="0 0 16 16" {...base} {...p}><path d="M3.5 1.5h6L13 5v9.5H3.5z"/><path d="M9 1.5V5h4"/></svg>
  ),
  Lock: (p: Props) => (
    <svg viewBox="0 0 16 16" {...base} {...p}><rect x="3" y="7" width="10" height="7" rx="1.5"/><path d="M5.5 7V5a2.5 2.5 0 015 0v2"/></svg>
  ),
  Calendar: (p: Props) => (
    <svg viewBox="0 0 16 16" {...base} {...p}><rect x="2.5" y="3.5" width="11" height="10" rx="1.5"/><path d="M2.5 6.5h11M5.5 2v3M10.5 2v3"/></svg>
  ),
  Clock: (p: Props) => (
    <svg viewBox="0 0 16 16" {...base} {...p}><circle cx="8" cy="8" r="6"/><path d="M8 5v3.2L10 10"/></svg>
  ),
  Shield: (p: Props) => (
    <svg viewBox="0 0 16 16" {...base} {...p}><path d="M8 1.5L13.5 4v4.5c0 3-2.5 5.5-5.5 6-3-.5-5.5-3-5.5-6V4z"/></svg>
  ),
  Card: (p: Props) => (
    <svg viewBox="0 0 16 16" {...base} {...p}><rect x="2" y="4" width="12" height="9" rx="1.5"/><path d="M2 7h12M5 11h2"/></svg>
  ),
  X: (p: Props) => (
    <svg viewBox="0 0 16 16" {...base} {...p}><path d="M4 4l8 8M12 4l-8 8"/></svg>
  ),
};

export function BrandMark({ size = 22 }: { size?: number }) {
  return (
    <span className="brand-mark" style={{ width: size, height: size, fontSize: size * 0.5 }}>M</span>
  );
}
