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
- **배포**: Vercel Serverless

## 🚀 개발 환경 실행

```bash
# 1) 의존성 설치
npm install

# 2) 환경 변수 설정 (.env)
cp .env.example .env
# DATABASE_URL=postgres://user:pass@localhost:5432/military_nutrition

# 3) 스키마 생성 + 시드 데이터
npm run db:migrate
npm run db:seed

# 4) 서버 실행
npm start
# http://localhost:5000
```

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
│   └── seed.js
└── vercel.json
```

## 🚧 다음 단계

- React(Vite) 프론트엔드: 부대 식단 입력 UI, 병사 개인 트래커, 통계 그래프
- 인증: 부대 PIN / JWT
- 농식품올바로 1,000+ 식재료 크롤링 후 `POST /api/foods/bulk`로 임포트
