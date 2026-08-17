import { describe, expect, it } from 'vitest';
import { parseEmbedUrl } from '../src/lib/embed-url';

describe('parseEmbedUrl', () => {
  it('recognizes a youtube.com/watch?v= URL', () => {
    expect(parseEmbedUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toEqual({
      provider: 'youtube',
      embedUrl: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
    });
  });

  it('recognizes a youtube.com/watch URL with extra query params before v=', () => {
    expect(parseEmbedUrl('https://www.youtube.com/watch?list=PL123&v=dQw4w9WgXcQ')).toEqual({
      provider: 'youtube',
      embedUrl: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
    });
  });

  it('recognizes a youtu.be short URL', () => {
    expect(parseEmbedUrl('https://youtu.be/dQw4w9WgXcQ')).toEqual({
      provider: 'youtube',
      embedUrl: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
    });
  });

  it('recognizes an already-embed youtube URL', () => {
    expect(parseEmbedUrl('https://www.youtube.com/embed/dQw4w9WgXcQ')).toEqual({
      provider: 'youtube',
      embedUrl: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
    });
  });

  it('recognizes a vimeo.com URL', () => {
    expect(parseEmbedUrl('https://vimeo.com/76979871')).toEqual({
      provider: 'vimeo',
      embedUrl: 'https://player.vimeo.com/video/76979871',
    });
  });

  it('returns null for an unsupported URL', () => {
    expect(parseEmbedUrl('https://example.com/video')).toBeNull();
  });

  it('returns null for a plain local file path', () => {
    expect(parseEmbedUrl('/videos/demo.mp4')).toBeNull();
  });
});
