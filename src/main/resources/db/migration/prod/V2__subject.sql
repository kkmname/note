CREATE TABLE subject (
    id          BIGINT          NOT NULL AUTO_INCREMENT,
    parent_id   BIGINT          NULL        COMMENT '상위 subject (중첩 폴더 지원, NULL이면 최상위)',
    name        VARCHAR(100)    NOT NULL    COMMENT '폴더명',
    sort_order  INT             NOT NULL DEFAULT 0 COMMENT '같은 depth 내 정렬 순서',
    created_at  DATE            NOT NULL DEFAULT CURRENT_DATE,
    modified_at DATE            NOT NULL DEFAULT CURRENT_DATE,

    CONSTRAINT pk_subject PRIMARY KEY (id),
    CONSTRAINT fk_subject_parent
        FOREIGN KEY (parent_id) REFERENCES subject (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

CREATE INDEX idx_subject_parent ON subject (parent_id);