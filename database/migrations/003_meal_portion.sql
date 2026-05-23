-- 끼니별 섭취량 조절(배율) 지원: soldier_meal_skips에 portion 컬럼 추가.
-- 기존 행(외출/회식 제외)은 portion 0(안 먹음)으로 유지됨.
-- 안 먹음=0, 적게=0.5, 보통=1, 많이=1.5. 행이 없으면 보통(1.0).
ALTER TABLE soldier_meal_skips ADD COLUMN IF NOT EXISTS portion DECIMAL(3, 2) DEFAULT 0;
