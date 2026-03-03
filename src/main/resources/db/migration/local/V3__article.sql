CREATE TABLE article (
    id          BIGINT          NOT NULL AUTO_INCREMENT,
    subject_id  BIGINT          NULL        COMMENT '소속 subject (NULL이면 최상위)',
    title       VARCHAR(200)    NOT NULL    COMMENT '노트 제목',
    description VARCHAR(500)    NULL        COMMENT '짧은 설명 (옵션)',
    contents    LONGTEXT        NULL        COMMENT '마크다운 본문',
    sort_order  INT             NOT NULL DEFAULT 0 COMMENT 'subject 내 정렬 순서',
    created_at  DATE            NOT NULL DEFAULT (CURRENT_DATE),
    modified_at DATE            NOT NULL DEFAULT (CURRENT_DATE),

    CONSTRAINT pk_article PRIMARY KEY (id),
    CONSTRAINT fk_article_subject
        FOREIGN KEY (subject_id) REFERENCES subject (id)
        ON DELETE SET NULL
        ON UPDATE CASCADE
);

CREATE INDEX idx_article_subject ON article (subject_id);
