// 外部動画URL(YouTube/Vimeo)を埋め込み用iframeのsrcへ変換する純粋関数。
// embed Block・video Blockの両方から共有される。汎用oEmbed APIは呼ばず、
// 主要サービスのURLパターンマッチングに限定する(汎用的なoEmbed対応はスコープ外)。

export type EmbedInfo = { provider: 'youtube' | 'vimeo'; embedUrl: string };

const YOUTUBE_PATTERN = /(?:youtube\.com\/watch\?(?:.*&)?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})/;
const VIMEO_PATTERN = /vimeo\.com\/(\d+)/;

export function parseEmbedUrl(url: string): EmbedInfo | null {
  const youtubeMatch = url.match(YOUTUBE_PATTERN);
  if (youtubeMatch) {
    return { provider: 'youtube', embedUrl: `https://www.youtube-nocookie.com/embed/${youtubeMatch[1]}` };
  }

  const vimeoMatch = url.match(VIMEO_PATTERN);
  if (vimeoMatch) {
    return { provider: 'vimeo', embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}` };
  }

  return null;
}
