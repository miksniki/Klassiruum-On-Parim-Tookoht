// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Nikita Mikson and contributors
import type { Face } from '../types';
let detector: Promise<import('@mediapipe/tasks-vision').FaceLandmarker> | undefined;
async function getDetector() {
  if (!detector) {
    detector = (async () => {
      const { FaceLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision');
      const files = await FilesetResolver.forVisionTasks(`${import.meta.env.BASE_URL}vendor/mediapipe`);
      const response = await fetch(
        'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
        { signal: AbortSignal.timeout(90000) },
      );
      if (!response.ok) throw new Error('Face model download failed');
      return FaceLandmarker.createFromOptions(files, {
        baseOptions: { modelAssetBuffer: new Uint8Array(await response.arrayBuffer()), delegate: 'CPU' },
        runningMode: 'IMAGE', numFaces: 5,
      });
    })().catch(error => { detector = undefined; throw error; });
  }
  return detector;
}
export async function detectFaces(canvas: HTMLCanvasElement): Promise<Face[]> {
  const model = await getDetector();
  return model.detect(canvas).faceLandmarks.map(landmarks => {
    const eye = (outer: number, inner: number) => {
      const a = landmarks[outer], b = landmarks[inner];
      return {
        x: (a.x + b.x) / 2 * canvas.width, y: (a.y + b.y) / 2 * canvas.height,
        radius: Math.hypot((a.x - b.x) * canvas.width, (a.y - b.y) * canvas.height) * 0.85,
      };
    };
    return { eyes: [eye(33, 133), eye(362, 263)].sort((a, b) => a.x - b.x) as Face['eyes'] };
  });
}
