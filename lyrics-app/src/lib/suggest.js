// 過去に保存した曲名・アーティスト名から、入力の候補を作る（予測変換のような機能）。
// lyrics は「新しい順」に並んでいる前提です（保存のたびに先頭に追加されるため）。

const MAX_CANDIDATES = 5; // 候補は多すぎると見づらいので5件まで

// 新しい順に、重複を除いた値の一覧を作る。
function uniqueValues(lyrics, key) {
  const seen = new Set();
  const result = [];
  for (const lyric of lyrics) {
    const value = (lyric[key] || '').trim();
    if (value && !seen.has(value)) {
      seen.add(value);
      result.push(value);
    }
  }
  return result;
}

// 入力中の文字を含む候補を返す。入力が空なら、新しい順に並べて返す。
function candidatesFor(lyrics, key, query) {
  const q = query.trim().toLowerCase();
  return uniqueValues(lyrics, key)
    .filter((v) => v.toLowerCase() !== q && v.toLowerCase().includes(q))
    .slice(0, MAX_CANDIDATES);
}

export function titleCandidates(lyrics, query) {
  return candidatesFor(lyrics, 'title', query);
}

export function artistCandidates(lyrics, query) {
  return candidatesFor(lyrics, 'artist', query);
}

// 同じ曲名で過去に保存したとき、そのアーティスト名を探す（いちばん新しいもの）。
export function findArtistForTitle(lyrics, title) {
  const t = title.trim().toLowerCase();
  if (!t) return null;
  const hit = lyrics.find((l) => l.title.trim().toLowerCase() === t && l.artist.trim());
  return hit ? hit.artist.trim() : null;
}
