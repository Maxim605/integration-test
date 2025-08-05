-- CREATE USER admin WITH PASSWORD 'admin';
-- CREATE DATABASE "lks-test" OWNER admin;
-- GRANT ALL PRIVILEGES ON DATABASE "lks-test" TO admin;
-- 
-- \c lks-test

DROP TABLE IF EXISTS users;

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    login VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO users (login, password) VALUES ('defaultuser', '100');
