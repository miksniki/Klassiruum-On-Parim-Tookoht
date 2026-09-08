// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Nikita Mikson and contributors
import imageCompression from "browser-image-compression";
import type { Photo } from "../types";
import { blobToCanvas, trimTransparentPixels } from "./canvas";
import { detectFaces } from "./face";
export function validatePhoto(file: File) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    throw new Error(
      "Palun vali JPG-, PNG- või WebP-pilt. HEIC-foto salvesta esmalt JPG-vormingus."
    );
  }
  if (file.size > 30 * 1024 * 1024)
    throw new Error("Pilt on liiga suur. Vali kuni 30 MB fail.");
  if (file.size === 0) throw new Error("See fail on tühi. Vali teine foto.");
}
function removeBackground(
  blob: Blob,
  signal: AbortSignal,
  onProgress: (message: string) => void
) {
  return new Promise<Blob>((resolve, reject) => {
    const worker = new Worker(
      new URL("../workers/background.worker.ts", import.meta.url),
      { type: "module" }
    );
    const clean = () => {
      worker.terminate();
      clearTimeout(timeout);
      signal.removeEventListener("abort", abort);
    };
    const abort = () => {
      clean();
      reject(new DOMException("Cancelled", "AbortError"));
    };
    const timeout = setTimeout(() => {
      clean();
      reject(
        new Error(
          "Töötlemine võttis liiga kaua aega. Proovi väiksemat fotot või kontrolli internetiühendust."
        )
      );
    }, 240000);
    signal.addEventListener("abort", abort, { once: true });
    if (signal.aborted) {
      abort();
      return;
    }
    worker.onmessage = (event) => {
      const data = event.data;
      if (data.type === "progress") {
        onProgress(
          data.loaded < data.total
            ? `Laadime tööriistu… ${(data.loaded / 1048576).toFixed(1)} / ${(data.total / 1048576).toFixed(1)} MB`
            : "Eemaldame tausta…"
        );
      } else if (data.type === "done") {
        clean();
        resolve(data.blob);
      } else {
        clean();
        console.error("Background removal:", data.message);
        reject(
          new Error(
            "Tausta eemaldamine ebaõnnestus. Kontrolli internetiühendust ja proovi uuesti."
          )
        );
      }
    };
    worker.onerror = (event) => {
      clean();
      console.error(event.message);
      reject(
        new Error(
          "Pilditöötlus ei käivitunud. Proovi uuemat Chrome’i, Edge’i või Firefoxi."
        )
      );
    };
    worker.postMessage(blob);
  });
}
export async function processPhoto(
  file: File,
  signal: AbortSignal,
  onProgress: (message: string) => void
): Promise<Photo> {
  validatePhoto(file);
  onProgress("Valmistame foto ette…");
  let prepared: File;
  try {
    prepared = await imageCompression(file, {
      maxWidthOrHeight: 2000,
      maxSizeMB: 4,
      useWebWorker: true,
      fileType: "image/png",
      signal,
      libURL: new URL(
        `${import.meta.env.BASE_URL}vendor/browser-image-compression.js`,
        location.href
      ).href
    });
  } catch (error) {
    signal.throwIfAborted();
    console.error("Photo preparation:", error);
    throw new Error(
      "Seda pilti ei saanud avada. Fail võib olla vigane. Proovi teist JPG-, PNG- või WebP-fotot.",
      { cause: error }
    );
  }
  signal.throwIfAborted();
  const original = await blobToCanvas(prepared);
  onProgress("Eemaldame tausta…");
  const cutout = await blobToCanvas(
    await removeBackground(prepared, signal, onProgress)
  );
  signal.throwIfAborted();
  onProgress("Leiame silmad ja sätime prillid…");
  let faces: Photo["faces"] = [];
  let warning: string | undefined;
  try {
    faces = await detectFaces(original);
    if (!faces.length)
      warning =
        "Nägu ei olnud piisavalt selgelt näha. Taust on valmis, kuid silmade ja prillide jaoks proovi otsevaates portreefotot.";
  } catch (error) {
    console.error("Face detection:", error);
    warning =
      "Näotuvastus ei käivitunud. Saad tausta vahetada ja pildi salvestada. Efektide jaoks kontrolli ühendust ning laadi foto uuesti.";
  }
  signal.throwIfAborted();
  if (cutout.width !== original.width || cutout.height !== original.height) {
    throw new Error("Pildi mõõtmed muutusid töötlemisel. Proovi teist fotot.");
  }
  return {
    original,
    cutout,
    bounds: trimTransparentPixels(cutout),
    faces,
    name: file.name,
    warning
  };
}
