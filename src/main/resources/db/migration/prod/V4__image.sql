-- ==============================
-- Image Table
-- ==============================
CREATE TABLE IF NOT EXISTS image (
    id          BIGINT          NOT NULL AUTO_INCREMENT,
    path        VARCHAR(255)    NOT NULL,
    article_id  BIGINT          NULL        COMMENT '소속 노트 (NULL 가능)',

    CONSTRAINT pk_image PRIMARY KEY (id),
    CONSTRAINT fk_image_article
        FOREIGN KEY (article_id) REFERENCES article (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

CREATE INDEX idx_image_article ON image (article_id);
