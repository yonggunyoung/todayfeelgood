// 구름이가 만든 곡 / 내 큐레이션 — 결과 하단 "이런 곡은 어때요?" 카드 소스.
// videos 가 비고 playlistId 도 비면 카드 자체가 숨겨진다(비파괴·config-gated).
// 채우는 법:
//   · 곡별: 유튜브에 올린 영상의 'ID'(주소 watch?v= 뒤 11자)를 videos 에 추가
//       { title: '비 오는 날', artist: '구름이', youtubeId: 'abcd1234XYZ' }
//     → 날짜별로 한 곡을 골라 인앱 임베드.
//   · 또는 playlistId 만 채우면 그 재생목록을 통째로 임베드(매일 올리면 자동 반영).
export const MY_MUSIC = {
  heading: '이런 곡은 어때요?',
  label: '구름이가 만든 곡',
  playlistId: '',
  videos: [
    // { title: '', artist: '구름이', youtubeId: '' },
  ],
};

function seed(str) { let h = 0; for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0; return h; }
export const myMusicEnabled = () => MY_MUSIC.videos.some((v) => v && v.youtubeId) || !!MY_MUSIC.playlistId;

// 오늘 보여줄 한 곡(또는 플리). 날짜 시드로 결정적. 없으면 null.
export function pickMyMusic(dateKey) {
  const vids = MY_MUSIC.videos.filter((v) => v && v.youtubeId);
  if (vids.length) return { kind: 'video', ...vids[seed(String(dateKey) + 'mm') % vids.length] };
  if (MY_MUSIC.playlistId) return { kind: 'playlist', playlistId: MY_MUSIC.playlistId };
  return null;
}
