export interface RegionRectCss {
  x: number;
  y: number;
  width: number;
  height: number;
  dpr: number;
}

export type KapturMessage =
  | { type: 'CAPTURE_VISIBLE'; sessionId: number }
  | { type: 'CAPTURE_REGION_START'; sessionId: number }
  | { type: 'START_REGION_OVERLAY'; sessionId: number }
  | {
      type: 'CAPTURE_REGION_COMPLETE';
      sessionId: number;
      rect: RegionRectCss;
    }
  | { type: 'OPEN_DASHBOARD'; route?: string };

export type KapturResponse<T = unknown> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

export interface CaptureCreatedPayload {
  captureId: number;
  customName: string;
}
