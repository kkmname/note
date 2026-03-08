-- ==============================
-- Users Table
-- ==============================
CREATE TABLE IF NOT EXISTS users (
    id                       BIGINT AUTO_INCREMENT PRIMARY KEY,
    name                     VARCHAR(255) NOT NULL,
    email                    VARCHAR(255) UNIQUE NOT NULL,
    password                 VARCHAR(255) NOT NULL,
    created_at               TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_accessed_at         TIMESTAMP,
    authority VARCHAR(20)    DEFAULT 'ALL'
);