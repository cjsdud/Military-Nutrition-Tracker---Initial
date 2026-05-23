-- 병사 개인 목표 자동계산(TDEE)용 신체정보 + 목표유형 컬럼 추가.
-- 기존 운영 DB(Neon 등)에 그대로 붙여넣어 실행하면 됨. (daily_*_goal 컬럼은 이미 존재)
ALTER TABLE soldiers ADD COLUMN IF NOT EXISTS goal_type VARCHAR(20);
ALTER TABLE soldiers ADD COLUMN IF NOT EXISTS sex VARCHAR(10);
ALTER TABLE soldiers ADD COLUMN IF NOT EXISTS age INT;
ALTER TABLE soldiers ADD COLUMN IF NOT EXISTS height_cm INT;
ALTER TABLE soldiers ADD COLUMN IF NOT EXISTS weight_kg DECIMAL(5, 1);
ALTER TABLE soldiers ADD COLUMN IF NOT EXISTS activity_level VARCHAR(20);
