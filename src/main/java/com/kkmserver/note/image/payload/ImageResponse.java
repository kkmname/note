package com.kkmserver.note.image.payload;

import com.kkmserver.note.image.domain.Image;
import lombok.Builder;

@Builder
public record ImageResponse(
    Long id,
    String path
) {
    public static ImageResponse of(Image image) {
        return ImageResponse.builder()
            .id(image.getId())
            .path(image.getPath())
            .build();
    }
}
