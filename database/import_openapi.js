/**
 * 식약처 통합 식품영양성분 DB OpenAPI(data.go.kr) 임포터.
 *
 * 사용법:
 *   DATA_GO_KR_KEY=<디코딩키> DATABASE_URL=... node database/import_openapi.js [옵션]
 *
 * 옵션:
 *   --inspect        첫 페이지 1건의 원본 필드명/값을 출력하고 종료 (필드 매핑 검증용)
 *   --pages=N        가져올 최대 페이지 수 (기본: 전체)
 *   --rows=N         페이지당 행 수 (기본 100)
 *   --query=밥       식품명 필터
 *   --dry-run        DB에 쓰지 않고 파싱 결과 건수만 출력
 *   --no-update      이름 중복 시 갱신하지 않고 건너뜀 (기본은 갱신)
 *
 * 환경변수:
 *   DATA_GO_KR_KEY            (필수) data.go.kr 인증키. 기본은 "디코딩" 키 사용.
 *   DATA_GO_KR_KEY_ENCODED    "true"면 이미 URL 인코딩된 키로 간주하고 그대로 사용.
 *   FOOD_API_BASE             API 엔드포인트. 기본: FoodNtrCpntDbInfo01 신버전.
 *   FOOD_API_VARIANT          'new'(기본) | 'i2790'  필드 매핑 프리셋 선택.
 */
require('dotenv').config();
const { pool } = require('../server/db');

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const opt = (name, def) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split('=').slice(1).join('=') : def;
};

const SERVICE_KEY = process.env.DATA_GO_KR_KEY;
const KEY_ENCODED = process.env.DATA_GO_KR_KEY_ENCODED === 'true';
const VARIANT = (process.env.FOOD_API_VARIANT || 'new').toLowerCase();
const API_BASE =
  process.env.FOOD_API_BASE ||
  (VARIANT === 'i2790'
    ? 'https://apis.data.go.kr/1471000/FoodNtrIrdntInfoService/getFoodNtrItdntList1'
    : 'https://apis.data.go.kr/1471000/FoodNtrCpntDbInfo01/getFoodNtrCpntDbInq01');

// 영양소별 후보 필드명 (API 버전에 따라 다르므로 여러 개를 순서대로 시도)
const FIELD_MAP = {
  name: ['foodNm', 'FOOD_NM_KR', 'DESC_KOR', 'foodNmKr'],
  calorie: ['enerc', 'AMT_NUM1', 'NUTR_CONT1', 'enercKcal'],
  protein: ['prot', 'AMT_NUM3', 'NUTR_CONT2'],
  fat: ['fatce', 'AMT_NUM4', 'NUTR_CONT3'],
  carbohydrate: ['chocdf', 'AMT_NUM6', 'NUTR_CONT4'],
  sugar: ['sugar', 'AMT_NUM7', 'NUTR_CONT5'],
  fiber: ['fibtg', 'AMT_NUM8'],
  sodium: ['nat', 'AMT_NUM13', 'NUTR_CONT6'],
  cholesterol: ['chole', 'AMT_NUM23', 'NUTR_CONT7'],
  saturated_fat: ['fasat', 'AMT_NUM24', 'NUTR_CONT8'],
  base_qty: ['nutConSrtrQua', 'SERVING_SIZE', 'servingSize', 'foodSize'],
};

const NUTRIENTS = ['calorie', 'protein', 'fat', 'carbohydrate', 'sugar', 'fiber', 'sodium', 'cholesterol', 'saturated_fat'];

function pick(item, candidates) {
  for (const key of candidates) {
    if (item[key] !== undefined && item[key] !== null && item[key] !== '') return item[key];
  }
  return undefined;
}

function num(v) {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(String(v).replace(/[, ]/g, ''));
  return Number.isFinite(n) ? n : null;
}

// "100g", "총 내용량 200g", "1회제공량(30g)" 등에서 기준 그램수 추출
function baseGrams(v) {
  if (!v) return 100;
  const s = String(v);
  // 단위(g/ml/그램/밀리리터)가 바로 붙은 숫자를 우선 (예: "1회제공량(30g)" → 30)
  const withUnit = s.match(/(\d+(?:\.\d+)?)\s*(?:g|ml|그램|밀리리터)/i);
  const n = withUnit ? Number(withUnit[1]) : Number((s.match(/\d+(?:\.\d+)?/) || [])[0]);
  return Number.isFinite(n) && n > 0 ? n : 100;
}

function buildUrl(pageNo, rows, query) {
  const params = new URLSearchParams({
    pageNo: String(pageNo),
    numOfRows: String(rows),
    type: 'json',
  });
  if (query) {
    // 신/구 버전 모두 식품명 필터 파라미터가 다를 수 있어 둘 다 추가
    params.set('foodNm', query);
    params.set('DESC_KOR', query);
  }
  const sep = API_BASE.includes('?') ? '&' : '?';
  const keyParam = `serviceKey=${KEY_ENCODED ? SERVICE_KEY : encodeURIComponent(SERVICE_KEY)}`;
  return `${API_BASE}${sep}${keyParam}&${params.toString()}`;
}

function extractItems(json) {
  const body = json?.response?.body ?? json?.body ?? json;
  let items = body?.items ?? body?.item;
  if (items && items.item) items = items.item;       // {items:{item:[...]}}
  if (json?.I2790?.row) items = json.I2790.row;       // 일부 구버전 셰이프
  if (!items) return { items: [], total: 0, body };
  if (!Array.isArray(items)) items = [items];
  const total = num(body?.totalCount) ?? num(json?.I2790?.total_count) ?? items.length;
  return { items, total, body };
}

async function fetchPage(pageNo, rows, query, attempt = 1) {
  const url = buildUrl(pageNo, rows, query);
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    const text = await res.text();
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
    try {
      return JSON.parse(text);
    } catch {
      throw new Error(`JSON 파싱 실패 (XML 오류 응답일 수 있음): ${text.slice(0, 200)}`);
    }
  } catch (err) {
    if (attempt >= 4) throw err;
    const wait = 2 ** attempt * 1000;
    console.warn(`  ↻ 페이지 ${pageNo} 재시도 ${attempt} (${wait}ms): ${err.message}`);
    await new Promise((r) => setTimeout(r, wait));
    return fetchPage(pageNo, rows, query, attempt + 1);
  }
}

function mapFood(item) {
  const name = pick(item, FIELD_MAP.name);
  if (!name) return null;
  const base = baseGrams(pick(item, FIELD_MAP.base_qty));
  const factor = 100 / base; // 모든 값을 100g 기준으로 정규화
  const out = { name: String(name).trim(), serving_size: 100, source: 'openapi' };
  for (const key of NUTRIENTS) {
    const raw = num(pick(item, FIELD_MAP[key]));
    out[key] = raw == null ? null : Math.round(raw * factor * 100) / 100;
  }
  return out;
}

async function upsertBatch(foods, doUpdate) {
  if (!foods.length) return { imported: 0 };
  const cols = ['name', ...NUTRIENTS, 'serving_size', 'source'];
  const values = [];
  const placeholders = foods.map((f, i) => {
    const base = i * cols.length;
    cols.forEach((c) => values.push(f[c]));
    return `(${cols.map((_, j) => `$${base + j + 1}`).join(', ')})`;
  });
  const conflict = doUpdate
    ? `DO UPDATE SET ${cols.filter((c) => c !== 'name').map((c) => `${c} = EXCLUDED.${c}`).join(', ')}`
    : 'DO NOTHING';
  const sql = `INSERT INTO foods (${cols.join(', ')}) VALUES ${placeholders.join(', ')}
               ON CONFLICT (name) ${conflict}`;
  const res = await pool.query(sql, values);
  return { imported: res.rowCount };
}

async function main() {
  if (!SERVICE_KEY) {
    console.error('❌ DATA_GO_KR_KEY 환경변수가 필요합니다 (data.go.kr 인증키).');
    process.exit(1);
  }
  const rows = parseInt(opt('rows', '100'), 10);
  const maxPages = opt('pages') ? parseInt(opt('pages'), 10) : Infinity;
  const query = opt('query', '');
  const dryRun = flag('dry-run');
  const doUpdate = !flag('no-update');

  console.log(`▶ API: ${API_BASE}`);
  console.log(`▶ 변형: ${VARIANT}, 페이지당 ${rows}행, 필터: ${query || '(없음)'}\n`);

  if (flag('inspect')) {
    const json = await fetchPage(1, 1, query);
    const { items, total, body } = extractItems(json);
    console.log('총 건수(totalCount):', total);
    if (!items.length) {
      console.log('원본 응답(앞부분):', JSON.stringify(json).slice(0, 800));
    } else {
      console.log('첫 항목 필드명:', Object.keys(items[0]).join(', '));
      console.log('\n첫 항목 원본:', JSON.stringify(items[0], null, 2));
      console.log('\n매핑 결과:', JSON.stringify(mapFood(items[0]), null, 2));
    }
    await pool.end();
    return;
  }

  let page = 1;
  let totalImported = 0;
  let totalParsed = 0;
  let totalCount = Infinity;
  const seen = new Set();

  while (page <= maxPages && (page - 1) * rows < totalCount) {
    const json = await fetchPage(page, rows, query);
    const { items, total } = extractItems(json);
    if (page === 1) {
      totalCount = total || items.length;
      console.log(`총 ${totalCount}건 예상\n`);
    }
    if (!items.length) break;

    const mapped = [];
    for (const it of items) {
      const f = mapFood(it);
      if (!f || seen.has(f.name)) continue;
      seen.add(f.name);
      mapped.push(f);
    }
    totalParsed += mapped.length;

    if (!dryRun) {
      const { imported } = await upsertBatch(mapped, doUpdate);
      totalImported += imported;
    }
    console.log(`  페이지 ${page}: 파싱 ${mapped.length} / 누적 적재 ${totalImported}`);
    page += 1;
    await new Promise((r) => setTimeout(r, 200)); // 호출 간 간격
  }

  console.log(`\n✅ 완료: 파싱 ${totalParsed}건${dryRun ? ' (dry-run, DB 미반영)' : `, DB 적재/갱신 ${totalImported}건`}`);
  await pool.end();
}

if (require.main === module) {
  main().catch((err) => {
    console.error('❌ 임포트 실패:', err);
    process.exit(1);
  });
}

module.exports = { mapFood, extractItems, baseGrams, num, pick, FIELD_MAP };
