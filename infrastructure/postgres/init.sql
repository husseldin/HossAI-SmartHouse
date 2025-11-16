-- PostgreSQL initialization script
-- Create TimescaleDB extension

CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Create hypertables for time-series data
-- These will be created by Prisma migrations, but we prepare the database

-- Grant all privileges to the application user
GRANT ALL PRIVILEGES ON DATABASE smarthome_platform TO smarthome;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Set timezone
SET timezone = 'UTC';
