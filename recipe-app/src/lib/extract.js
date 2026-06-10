// 소스 판별 + 콘텐츠 수집 라우터.
// 입구는 여러 개(유튜브 링크 / 웹 링크 / 텍스트)지만 출구는 하나의 표준 스키마.

export function detectSource(input) {
  const trimmed = input.trim();
  const videoId = parseYouTubeId(trimmed);
  if (videoId) return { type: 'youtube', url: trimmed, videoId };
  if (/^https?:\/\/\S+$/.test(trimmed)) return { type: 'web', url: trimmed };
  return { type: 'text', text: trimmed };
}

export function parseYouTubeId(url) {
  const patterns = [
    /youtube\.com\/watch\?.*v=([\w-]{11})/,
    /youtu\.be\/([\w-]{11})/,
    /youtube\.com\/shorts\/([\w-]{11})/,
    /youtube\.com\/embed\/([\w-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

// 유튜브 메타데이터 (noembed: CORS 허용 oEmbed 프록시)
export async function fetchYouTubeMeta(videoId) {
  try {
    const res = await fetch(
      `https://noembed.com/embed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}`
    );
    const data = await res.json();
    return {
      title: data.title ?? '',
      author: data.author_name ?? '',
      thumbnail: data.thumbnail_url ?? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    };
  } catch {
    return { title: '', author: '', thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` };
  }
}

// 웹페이지 본문 (jina reader: CORS 허용, 마크다운 반환). 실패 시 null → 사용자에게 본문 붙여넣기 요청.
export async function fetchWebContent(url) {
  try {
    const res = await fetch(`https://r.jina.ai/${url}`, {
      headers: { Accept: 'text/plain' },
    });
    if (!res.ok) return null;
    const text = await res.text();
    return text.slice(0, 30000);
  } catch {
    return null;
  }
}
