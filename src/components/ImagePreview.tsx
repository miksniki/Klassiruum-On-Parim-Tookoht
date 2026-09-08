// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Nikita Mikson and contributors
import { useEffect, useMemo, useRef } from "react";
import type { Photo, Settings } from "../types";
import {
  composeImage,
  createPerson,
  loadImage,
  OUTPUT_HEIGHT,
  OUTPUT_WIDTH
} from "../utils/generateImage";
export interface RenderedImage {
  canvas: HTMLCanvasElement;
  photo: Photo | null;
  settings: Settings;
  background: string;
}
interface Props {
  photo: Photo | null;
  settings: Settings;
  background: string;
  compare: boolean;
  onRender: (result: RenderedImage) => void;
  onError: (message: string) => void;
  onMove: (x: number, y: number) => void;
}
export function ImagePreview({
  photo,
  settings,
  background,
  compare,
  onRender,
  onError,
  onMove
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drag = useRef<{
    clientX: number;
    clientY: number;
    x: number;
    y: number;
  } | null>(null);
  const { eyes, glasses, glassesScale, glassesY } = settings;
  const person = useMemo(
    () =>
      photo
        ? createPerson(photo, {
            eyes,
            glasses,
            glassesScale,
            glassesY,
            zoom: 100,
            x: 0,
            y: 0
          })
        : null,
    [photo, eyes, glasses, glassesScale, glassesY]
  );
  useEffect(() => {
    let cancelled = false;
    loadImage(background)
      .then((image) => {
        if (cancelled || !canvasRef.current) return;
        const result = composeImage(image, photo, person, settings);
        const ctx = canvasRef.current.getContext("2d")!;
        ctx.clearRect(0, 0, OUTPUT_WIDTH, OUTPUT_HEIGHT);
        if (compare && photo) {
          ctx.fillStyle = "#e9e7df";
          ctx.fillRect(0, 0, OUTPUT_WIDTH, OUTPUT_HEIGHT);
          const scale = Math.min(
            OUTPUT_WIDTH / photo.original.width,
            OUTPUT_HEIGHT / photo.original.height
          );
          ctx.drawImage(
            photo.original,
            (OUTPUT_WIDTH - photo.original.width * scale) / 2,
            (OUTPUT_HEIGHT - photo.original.height * scale) / 2,
            photo.original.width * scale,
            photo.original.height * scale
          );
        } else ctx.drawImage(result, 0, 0);
        onRender({ canvas: result, photo, settings, background });
      })
      .catch((error) => {
        if (!cancelled) onError(error.message);
      });
    return () => {
      cancelled = true;
    };
  }, [background, person, photo, settings, compare, onRender, onError]);
  return (
    <canvas
      ref={canvasRef}
      width={OUTPUT_WIDTH}
      height={OUTPUT_HEIGHT}
      className={photo && !compare ? "movable" : ""}
      tabIndex={photo && !compare ? 0 : -1}
      aria-label={
        photo
          ? "Sinu foto eelvaade. Liiguta inimest lohistades või nooleklahvidega."
          : "Valitud tausta eelvaade"
      }
      onKeyDown={(event) => {
        if (
          !photo ||
          compare ||
          !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(
            event.key
          )
        )
          return;
        event.preventDefault();
        const step = event.shiftKey ? 5 : 1;
        onMove(
          settings.x +
            (event.key === "ArrowLeft"
              ? -step
              : event.key === "ArrowRight"
                ? step
                : 0),
          settings.y +
            (event.key === "ArrowUp"
              ? -step
              : event.key === "ArrowDown"
                ? step
                : 0)
        );
      }}
      onPointerDown={(event) => {
        if (!photo || compare) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        drag.current = {
          clientX: event.clientX,
          clientY: event.clientY,
          x: settings.x,
          y: settings.y
        };
      }}
      onPointerMove={(event) => {
        if (!drag.current) return;
        const rect = event.currentTarget.getBoundingClientRect();
        onMove(
          drag.current.x +
            ((event.clientX - drag.current.clientX) / rect.width) * 100,
          drag.current.y +
            ((event.clientY - drag.current.clientY) / rect.height) * 100
        );
      }}
      onPointerUp={() => {
        drag.current = null;
      }}
      onPointerCancel={() => {
        drag.current = null;
      }}
      onLostPointerCapture={() => {
        drag.current = null;
      }}
    />
  );
}
