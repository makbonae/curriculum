/* ===== CSV 설정 ===== */
const CSV_URLS = {
  inmun:  'https://docs.google.com/spreadsheets/d/e/2PACX-1vRSYCrY1GI-35QWWS5BnB9whdm259gOUvDWCi_raTAi-Egirt7szGtx_vrWk2imF3k3yVVwR2LDdDSH/pub?gid=227554641&single=true&output=csv',
  jayeon: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRSYCrY1GI-35QWWS5BnB9whdm259gOUvDWCi_raTAi-Egirt7szGtx_vrWk2imF3k3yVVwR2LDdDSH/pub?gid=0&single=true&output=csv'
};

/* ===== (선택) 5분 캐시 ===== */
const CACHE_TTL_MS = 5 * 60 * 1000;
function cacheGet(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { ts, data } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL_MS) return null;
    return data;
  } catch { return null; }
}
function cacheSet(key, data) {
  try { localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data })); } catch {}
}

/* ===== CSV 로딩 & 파싱 ===== */
async function fetchSheetRows(sheetKey) {
  const url = CSV_URLS[sheetKey];
  if (!url) throw new Error(`CSV URL 미설정: ${sheetKey}`);

  const cacheKey = `csv:${sheetKey}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`CSV 요청 실패: ${res.status}`);
  const csvText = await res.text();

  // Papa Parse가 전역에 로드되어 있어야 함
  const parsed = Papa.parse(csvText, {
    header: true,
    dynamicTyping: false,
    skipEmptyLines: true
  });
  if (parsed.errors?.length) console.warn('CSV parse errors:', parsed.errors);

  const rows = (parsed.data || []).map(row => {
    const cleaned = {};
    for (const k in row) {
      const key = (k || '').trim();
      const val = typeof row[k] === 'string' ? row[k].trim() : row[k];
      if (key) cleaned[key] = val;
    }
    return cleaned;
  });

  cacheSet(cacheKey, rows);
  return rows;
}

/* ===== 스키마 정규화 (헤더명 보정) ===== */
function normalizeMajors(rows) {
  return rows.map((r, i) => ({
    id:         toInt(r.id ?? r.ID ?? (i + 1)),
    major:      r.major ?? r.전공 ?? r.Major ?? '',
    major_ref:  r.major_ref ?? r['major-ref'] ?? r['유사학과코드'] ?? '',
    major_type: r.major_type ?? r.type ?? r.계열 ?? '',
    friends:    r.friends ?? r['유사학과'] ?? '',
    desc:       r.desc ?? r['설명'] ?? '',
    sub1:       r.sub1 ?? r['과목1'] ?? '',
    sub2:       r.sub2 ?? r['과목2'] ?? '',
    sub3:       r.sub3 ?? r['과목3'] ?? '',
    univ:       r.univ ?? r['대표대학'] ?? '',
    group:      r.group ?? r['그룹'] ?? r['계열그룹'] ?? ''
  }));
}
function toInt(x) { const n = parseInt(x, 10); return Number.isFinite(n) ? n : undefined; }

/* ===== 페이지별 진입 헬퍼 ===== */
// page_1.html (토너먼트)
async function startCategory(sheetKey) {
  try {
    if (typeof showLoading === 'function') showLoading('데이터 로딩 중…');
    const rawRows = await fetchSheetRows(sheetKey);
    const items   = normalizeMajors(rawRows);
    // 아래 함수명을 네가 쓰던 렌더/시작 함수명으로 바꿔줘
    if (typeof startTournament === 'function') {
      startTournament(items, sheetKey);
    } else {
      console.warn('startTournament(items, sheetKey) 함수를 구현/불러와야 합니다.');
    }
  } catch (e) {
    alert('불러오기 실패: ' + e.message);
    console.error(e);
  } finally {
    if (typeof hideLoading === 'function') hideLoading();
  }
}

// page_2.html (과목/상세)
async function loadSubjects(sheetKey) {
  try {
    if (typeof showLoading === 'function') showLoading('과목 데이터 로딩 중…');
    const rawRows = await fetchSheetRows(sheetKey);
    const items   = normalizeMajors(rawRows);
    // 아래 함수명을 네가 쓰던 렌더 함수명으로 바꿔줘
    if (typeof renderSubjects === 'function') {
      renderSubjects(items);
    } else {
      console.warn('renderSubjects(items) 함수를 구현/불러와야 합니다.');
    }
  } catch (e) {
    alert('불러오기 실패: ' + e.message);
    console.error(e);
  } finally {
    if (typeof hideLoading === 'function') hideLoading();
  }
}

