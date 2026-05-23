# 🍽️ 군부대 식단 영양가 추적 웹앱

부대 단위 식단 관리 + 병사 개인 영양 추적을 하나의 백엔드에서 제공합니다.

## 🎯 주요 기능

### 부대(영양사/관리자)
- 부대별 일/월간 식단표 입력 (조식/중식/석식 × 식재료 × 그램수)
- 식재료 추가 시 자동 영양가 계산
- 월간 통계 / 끼니별 분포 / 식단 작성 누락 일자 확인
- 지난 날짜 식단 복사로 한주치 빠른 입력

### 병사(개인)
- 부대 식단의 영양가가 자동 누적
- DB에 없는 음식도 즉석 입력(`custom_name` + 칼로리/단백/탄수/지방)
- 끼니 구분(breakfast/lunch/dinner/snack/late_night) + 메모(예: "운동 후", "야간근무")
- 외출/회식 등으로 부대식단을 빠진 끼니는 통계에서 제외
- 자주 먹는 음식 Top N + 즐겨찾기 빠른 등록
- 어제 식단 복사로 "다시 먹기"
- 개인 일일 칼로리/단백질/탄수/지방 목표 대비 달성률

## 🏗️ 기술 스택

- **백엔드**: Node.js + Express
- **DB**: PostgreSQL (`pg` 클라이언트, Neon/Supabase/Vercel Postgres 호환)
- **프론트엔드**: React 18 + Vite + Tailwind CSS + Recharts (`client/`)
- **배포**: Vercel Serverless

## 🚀 개발 환경 실행

### 1) 백엔드

```bash
# 의존성 설치
npm install

# 환경 변수 설정 (.env)
cp .env.example .env
# DATABASE_URL=postgres://user:pass@localhost:5432/military_nutrition

# 스키마 생성 + 시드 데이터
npm run db:migrate
npm run db:seed

# 서버 실행
npm start
# http://localhost:5000
```

### 2) 프론트엔드

```bash
cd client
npm install
npm run dev
# http://localhost:5173  (개발 중 /api 요청은 자동으로 localhost:5000 백엔드로 프록시)
```

빌드: `npm run build` → `client/dist/` 정적 파일 생성.

## 🖥️ 화면 구성 (client/)

- **부대 식단** (`/meals`): 부대·날짜 선택 → 조식/중식/석식에 음식 추가 → 자동 영양가 계산, 어제 식단 복사
- **병사 추적** (`/soldiers`): 부대 식단 자동 합산 + 개인 음식 로깅(직접 입력 포함), 외출/회식 끼니 제외, 어제 그대로 복사, 목표 대비 달성률
- **통계** (`/stats`): 월간 일평균 지표, 일별 칼로리 추이(선형) + 영양소(막대) 그래프, 식단 작성 누락 일자 확인
- 모바일: 하단 탭 네비게이션, 44px 터치 타깃, 모달 바텀시트

## 📚 API 개요

| 그룹 | 엔드포인트 |
|---|---|
| 헬스체크 | `GET /api/health` |
| 부대 | `POST/GET /api/units`, `GET /api/units/:id` |
| 식재료 | `POST/GET /api/foods`, `GET /api/foods/search?q=`, `POST /api/foods/bulk` |
| 식단 | `POST /api/meals`, `GET /api/meals/:unit_id/:date`, `PUT/DELETE /api/meals/:meal_id`, `POST /api/meals/copy` |
| 병사 | `POST/GET /api/soldiers`, `PUT/DELETE /api/soldiers/:id` |
| 즐겨찾기 | `GET/POST /api/soldiers/:id/favorites`, `DELETE /api/soldiers/:id/favorites/:food_id` |
| 자주 먹은 음식 | `GET /api/soldiers/:id/frequent-foods?limit=10` |
| 병사 로그 | `POST /api/soldier-logs`, `GET /api/soldier-logs/:soldier_id/:date`, `DELETE /api/soldier-logs/:log_id` |
| 빠른 재입력 | `POST /api/soldier-logs/duplicate` |
| 끼니 빠짐 | `POST /api/soldier-logs/skip`, `GET /api/soldier-logs/skip/:soldier_id/:date`, `DELETE /api/soldier-logs/skip/:skip_id` |
| 부대 통계 | `GET /api/unit-stats/:unit_id/:year/:month`, `GET /api/units/:unit_id/report/:year/:month` |
| 부대 누락 일자 | `GET /api/unit-coverage/:unit_id/:year/:month` |
| 병사 통계 | `GET /api/soldier-stats/:soldier_id/:date` (일), `GET /api/soldier-stats/:soldier_id/:year/:month` (월) |

### 즉석 입력(custom) 로그 예시

```json
POST /api/soldier-logs
{
  "soldier_id": 1,
  "log_date": "2026-05-23",
  "custom_name": "PX 라면",
  "custom_calorie": 436,
  "custom_protein": 9,
  "custom_carbohydrate": 61,
  "custom_fat": 17,
  "quantity": 100,
  "meal_type": "late_night",
  "memo": "야간근무"
}
```

### 일일 종합 통계 예시

```json
GET /api/soldier-stats/1/2026-05-23
{
  "soldier": { "id": 1, "name": "김철영", "rank": "이병" },
  "skipped_meals": ["lunch"],
  "unit_meals": { "calorie": 432.9, "protein": 22, ... },
  "unit_by_meal": { "breakfast": {...}, "lunch": {...}, "dinner": {...} },
  "additional_logs": { "calorie": 436, "protein": 9, "carbohydrate": 61, "fat": 17 },
  "totals": { "calorie": 868.9, "protein": 31, "carbohydrate": 115.5, "fat": 30.9 },
  "goals": { "calorie": 2800, "protein": 120, "carbohydrate": null, "fat": null },
  "progress_percent": { "calorie": 31.0, "protein": 25.8 }
}
```

## 🗂️ 디렉토리 구조

```
.
├── server/
│   ├── index.js          # Express 앱 진입점
│   ├── db.js             # pg 풀
│   ├── routes/           # 도메인별 라우터
│   └── utils/            # 영양 계산 / async wrapper
├── database/
│   ├── schema.sql        # PostgreSQL 스키마
│   ├── seed.sql          # 샘플 데이터 (부대/식재료/병사)
│   ├── migrate.js
│   ├── seed.js
│   └── import_openapi.js # 식약처 식품영양성분 OpenAPI 임포터
└── vercel.json
```

## 🥗 식재료 대량 임포트 (식약처 OpenAPI)

[data.go.kr](https://www.data.go.kr)에서 "식품영양성분 데이터베이스" 활용신청 후 인증키를 받아 1,000+ 식재료를 적재합니다. 외부 네트워크 접속이 가능한 환경에서 실행하세요.

```bash
# .env 에 DATA_GO_KR_KEY 설정 후

# 1) 실제 응답 필드명/매핑이 맞는지 먼저 확인 (1건만 조회)
DATA_GO_KR_KEY=... npm run db:import -- --inspect

# 2) 소량 시험 (DB 미반영)
npm run db:import -- --pages=2 --dry-run

# 3) 전체 적재 (이름 중복 시 갱신)
npm run db:import
```

- 필드명이 API 버전에 따라 다를 수 있어 **여러 후보를 자동 매핑**하며, `--inspect`로 원본 필드를 확인할 수 있습니다.
- 모든 영양성분은 함량 기준량(예: `1회제공량(30g)`)을 파싱해 **100g 기준으로 정규화**되어 저장됩니다.
- 구버전 API(`I2790`, `NUTR_CONT*` 필드)는 `FOOD_API_VARIANT=i2790`로 전환 가능합니다.

> ⚠️ 클라우드 웹 세션은 기본적으로 외부 접속이 차단될 수 있습니다. 네트워크 정책 설정은
> [Claude Code on the web 문서](https://code.claude.com/docs/en/claude-code-on-the-web)를 참고하세요.

## 🚧 다음 단계

- 인증: 부대 PIN / JWT
- 식재료 임포트 실행 후 검색 품질 점검 (동의어/분류 보강)
- Vercel 배포 + 관리형 PostgreSQL(Neon/Supabase) 연결
