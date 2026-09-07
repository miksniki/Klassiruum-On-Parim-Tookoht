// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Nikita Mikson and contributors
import type { CSSProperties, ReactNode } from 'react';
type Name = 'upload' | 'download' | 'sparkles' | 'arrow' | 'check' | 'shield' | 'reset' | 'image' | 'move' | 'close' | 'eye' | 'book';
const paths: Record<Name, ReactNode> = {
  upload: <path d="M12 16V3m-5 5 5-5 5 5M4 16v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4"/>,
  download: <path d="M12 3v13m-5-5 5 5 5-5M4 16v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4"/>,
  sparkles: <path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3ZM20 2v4m-2-2h4"/>,
  arrow: <path d="M4 12h16m-6-6 6 6-6 6"/>, check: <path d="m5 12 4 4L19 6"/>,
  shield: <><path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z"/><path d="m8 12 3 3 5-6"/></>,
  reset: <path d="M3 10a9 9 0 1 1 1 8M3 4v6h6"/>,
  image: <><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1"/><path d="m3 17 6-6 4 4 3-3 5 5"/></>,
  move: <path d="M12 3v18M3 12h18m-12-6 3-3 3 3m-6 12 3 3 3-3M6 9l-3 3 3 3m12-6 3 3-3 3"/>,
  close: <path d="m6 6 12 12M6 18 18 6"/>,
  eye: <><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></>,
  book: <path d="M12 6C9 3 5 3 2 4v15c4-1 7-1 10 2 3-3 6-3 10-2V4c-3-1-7-1-10 2Zm0 0v15"/>,
};
export function Icon({ name, size = 20, style }: { name: Name; size?: number; style?: CSSProperties }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={style}>{paths[name]}</svg>;
}
export function GlassesIcon({ style = 'round' }: { style?: string }) {
  return <svg width="54" height="28" viewBox="0 0 64 32" fill="none" stroke="currentColor" strokeWidth="2.7" aria-hidden="true">
    {style === 'none' ? <><circle cx="32" cy="16" r="12"/><path d="m23 7 18 18"/></> : <>
      {style === 'round' ? <><circle cx="17" cy="17" r="12"/><circle cx="47" cy="17" r="12"/></> : <><rect x="4" y="7" width="25" height="21" rx="5" fill={style === 'sun' ? 'currentColor' : 'none'}/><rect x="35" y="7" width="25" height="21" rx="5" fill={style === 'sun' ? 'currentColor' : 'none'}/></>}
      <path d="M29 14q3-4 6 0M5 12 1 8m58 4 4-4"/>
    </>}
  </svg>;
}
