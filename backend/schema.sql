-- NIAT Worklog Management System
-- PostgreSQL Database Schema (DDL)

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- Custom ENUM Types
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('MENTOR', 'MANAGER', 'ADMIN');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE user_status AS ENUM ('ACTIVE', 'INACTIVE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE activity_group_type AS ENUM ('LEARNING', 'MENTORING', 'INVIGILATION', 'ADMINISTRATIVE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE worklog_status AS ENUM ('DRAFT', 'SUBMITTED', 'LOCKED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE task_priority AS ENUM ('LOW', 'MEDIUM', 'HIGH');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE task_status AS ENUM ('IN_PROGRESS', 'COMPLETED', 'BLOCKED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'MENTOR',
    manager_id UUID REFERENCES users(id) ON DELETE SET NULL,
    status user_status NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_manager_id ON users(manager_id);

-- 2. Activity Categories Table
CREATE TABLE IF NOT EXISTS activity_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    activity_group activity_group_type NOT NULL,
    qualifies_for_six_hours BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_activity_categories_group ON activity_categories(activity_group);

-- 3. Daily Worklogs Table
CREATE TABLE IF NOT EXISTS daily_worklogs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mentor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    work_date DATE NOT NULL,
    status worklog_status NOT NULL DEFAULT 'DRAFT',
    total_actual_minutes INT NOT NULL DEFAULT 0,
    is_target_achieved BOOLEAN NOT NULL DEFAULT FALSE,
    submission_time TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_mentor_workdate UNIQUE (mentor_id, work_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_worklogs_mentor_date ON daily_worklogs(mentor_id, work_date);
CREATE INDEX IF NOT EXISTS idx_daily_worklogs_status ON daily_worklogs(status);

-- 4. Worklog Activities Table
CREATE TABLE IF NOT EXISTS worklog_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    worklog_id UUID NOT NULL REFERENCES daily_worklogs(id) ON DELETE CASCADE,
    mentor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES activity_categories(id) ON DELETE RESTRICT,
    task_name VARCHAR(255) NOT NULL,
    task_description TEXT,
    outcome TEXT,
    priority task_priority NOT NULL DEFAULT 'MEDIUM',
    status task_status NOT NULL DEFAULT 'COMPLETED',
    planned_minutes INT,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    actual_minutes INT NOT NULL,
    remarks TEXT,
    dependencies TEXT,
    deviations TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_end_after_start CHECK (end_time > start_time),
    CONSTRAINT chk_positive_actual_minutes CHECK (actual_minutes > 0)
);

CREATE INDEX IF NOT EXISTS idx_activities_worklog_id ON worklog_activities(worklog_id);
CREATE INDEX IF NOT EXISTS idx_activities_mentor_id ON worklog_activities(mentor_id);
CREATE INDEX IF NOT EXISTS idx_activities_category_id ON worklog_activities(category_id);
CREATE INDEX IF NOT EXISTS idx_activities_time_range ON worklog_activities(mentor_id, start_time, end_time);

-- Anti-overlap exclusion constraint using btree_gist extension (or trigger)
-- Ensures no two activities for the same mentor have overlapping [start_time, end_time) intervals.
DO $$ BEGIN
    ALTER TABLE worklog_activities
    ADD CONSTRAINT no_activity_overlap
    EXCLUDE USING gist (
        mentor_id WITH =,
        tstzrange(start_time, end_time, '[)') WITH &&
    );
EXCEPTION
    WHEN duplicate_table THEN null;
    WHEN others THEN null; -- Fallback if extension not loaded in standalone setups
END $$;

-- 5. Manager Feedback Table
CREATE TABLE IF NOT EXISTS manager_feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    worklog_id UUID NOT NULL REFERENCES daily_worklogs(id) ON DELETE CASCADE,
    manager_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    remarks TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_manager_feedback_worklog ON manager_feedback(worklog_id);
CREATE INDEX IF NOT EXISTS idx_manager_feedback_manager ON manager_feedback(manager_id);
