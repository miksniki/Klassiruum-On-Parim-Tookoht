// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Nikita Mikson and contributors
export interface Point {
  x: number;
  y: number;
}
export interface Eye extends Point {
  radius: number;
}
export interface Face {
  eyes: [Eye, Eye];
}
export interface Photo {
  original: HTMLCanvasElement;
  cutout: HTMLCanvasElement;
  bounds: { x: number; y: number; width: number; height: number };
  faces: Face[];
  name: string;
  warning?: string;
}
export type GlassesStyle = "none" | "round" | "square" | "sun";
export interface Settings {
  eyes: number;
  glasses: GlassesStyle;
  glassesScale: number;
  glassesY: number;
  zoom: number;
  x: number;
  y: number;
}
export const DEFAULT_SETTINGS: Settings = {
  eyes: 40,
  glasses: "round",
  glassesScale: 100,
  glassesY: 0,
  zoom: 100,
  x: 0,
  y: 0
};
