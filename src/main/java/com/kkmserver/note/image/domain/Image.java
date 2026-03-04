package com.kkmserver.note.image.domain;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(
    name = "image",
    indexes = @Index(name = "idx_image_article", columnList = "article_id")
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class Image {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 255)
    private String path;

    @Column(name = "article_id")
    private Long articleId;
}
