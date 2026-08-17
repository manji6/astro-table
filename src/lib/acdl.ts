// ACDLコア(パターンB)。
// Blockローカルな操作は、このヘルパーで直接pushする(中央のブリッジ層を経由しない)。

export interface AdobeDataLayerLike {
  push(item: Record<string, unknown>): void;
}

declare global {
  interface Window {
    adobeDataLayer: AdobeDataLayerLike;
  }
}

export function pushEvent(eventName: string, payload: Record<string, unknown> = {}): void {
  window.adobeDataLayer.push({ event: eventName, ...payload });
}
