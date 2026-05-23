CREATE TABLE IF NOT EXISTS units (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS foods (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  calorie DECIMAL(10, 2),
  protein DECIMAL(10, 2),
  carbohydrate DECIMAL(10, 2),
  fat DECIMAL(10, 2),
  fiber DECIMAL(10, 2),
  sugar DECIMAL(10, 2),
  sodium DECIMAL(10, 2),
  cholesterol DECIMAL(10, 2),
  saturated_fat DECIMAL(10, 2),
  serving_size INT DEFAULT 100,
  source VARCHAR(50) DEFAULT 'system',
  created_by_soldier_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS meals (
  id SERIAL PRIMARY KEY,
  unit_id INT REFERENCES units(id) ON DELETE CASCADE,
  meal_date DATE NOT NULL,
  meal_type VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (unit_id, meal_date, meal_type)
);

CREATE TABLE IF NOT EXISTS meal_foods (
  id SERIAL PRIMARY KEY,
  meal_id INT REFERENCES meals(id) ON DELETE CASCADE,
  food_id INT REFERENCES foods(id),
  quantity INT DEFAULT 100
);

CREATE TABLE IF NOT EXISTS soldiers (
  id SERIAL PRIMARY KEY,
  unit_id INT REFERENCES units(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  rank VARCHAR(50),
  daily_calorie_goal INT,
  daily_protein_goal INT,
  daily_carb_goal INT,
  daily_fat_goal INT,
  goal_type VARCHAR(20),
  sex VARCHAR(10),
  age INT,
  height_cm INT,
  weight_kg DECIMAL(5, 1),
  activity_level VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 병사 개인 음식 로그
-- food_id가 NULL이면 즉석 입력(custom_*) 값을 사용
CREATE TABLE IF NOT EXISTS soldier_logs (
  id SERIAL PRIMARY KEY,
  soldier_id INT REFERENCES soldiers(id) ON DELETE CASCADE,
  food_id INT REFERENCES foods(id),
  custom_name VARCHAR(255),
  custom_calorie DECIMAL(10, 2),
  custom_protein DECIMAL(10, 2),
  custom_carbohydrate DECIMAL(10, 2),
  custom_fat DECIMAL(10, 2),
  quantity INT DEFAULT 100,
  meal_type VARCHAR(50) DEFAULT 'snack',
  memo TEXT,
  log_date DATE NOT NULL,
  logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CHECK (food_id IS NOT NULL OR custom_name IS NOT NULL)
);

-- 부대 식단 끼니별 섭취량 조절 (안 먹음=0, 적게=0.5, 보통=1, 많이=1.5)
-- 행이 없으면 보통(1.0)으로 간주
CREATE TABLE IF NOT EXISTS soldier_meal_skips (
  id SERIAL PRIMARY KEY,
  soldier_id INT REFERENCES soldiers(id) ON DELETE CASCADE,
  skip_date DATE NOT NULL,
  meal_type VARCHAR(50) NOT NULL,
  portion DECIMAL(3, 2) DEFAULT 0,
  reason VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (soldier_id, skip_date, meal_type)
);

-- 즐겨찾기 음식 (빠른 등록용)
CREATE TABLE IF NOT EXISTS soldier_favorites (
  id SERIAL PRIMARY KEY,
  soldier_id INT REFERENCES soldiers(id) ON DELETE CASCADE,
  food_id INT REFERENCES foods(id) ON DELETE CASCADE,
  default_quantity INT DEFAULT 100,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (soldier_id, food_id)
);

CREATE INDEX IF NOT EXISTS idx_meals_unit_date ON meals(unit_id, meal_date);
CREATE INDEX IF NOT EXISTS idx_soldier_logs_soldier_date ON soldier_logs(soldier_id, log_date);
CREATE INDEX IF NOT EXISTS idx_soldier_logs_date ON soldier_logs(log_date);
CREATE INDEX IF NOT EXISTS idx_foods_name ON foods(name);
CREATE INDEX IF NOT EXISTS idx_soldier_skips ON soldier_meal_skips(soldier_id, skip_date);
