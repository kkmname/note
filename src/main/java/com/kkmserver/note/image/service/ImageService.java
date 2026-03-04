package com.kkmserver.note.image.service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.kkmserver.note.image.domain.Image;
import com.kkmserver.note.image.payload.ImageResponse;
import com.kkmserver.note.image.repository.ImageRepository;

import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
@AllArgsConstructor
public class ImageService {

    private final ImageRepository imageRepository;
    private final String uploadDir = "/drive/images/note";

    public ImageResponse upload(MultipartFile file, Long articleId) throws IOException {
        // 원본 파일명 및 확장자 추출
        String originalFileName = file.getOriginalFilename();
        String fileExtension = getFileExtension(originalFileName);

        // 임시 레코드 저장으로 ID 확보
        Image image = Image.builder()
            .articleId(articleId)
            .path("")
            .build();
        Image savedImage = imageRepository.save(image);

        // 노트별 디렉토리 생성
        String articleImageDir = uploadDir + "/" + articleId;
        Files.createDirectories(Paths.get(articleImageDir));

        // 파일 저장 (image ID를 파일명으로 사용)
        String fileName = savedImage.getId() + "." + fileExtension;
        Path filePath = Paths.get(articleImageDir, fileName);
        Files.write(filePath, file.getBytes());

        // DB 레코드 경로 업데이트
        String storedPath = uploadDir + "/" + articleId + "/" + fileName;
        savedImage = Image.builder()
            .id(savedImage.getId())
            .path(storedPath)
            .articleId(articleId)
            .build();
        imageRepository.save(savedImage);

        return ImageResponse.of(savedImage);
    }

    public Path getImagePath(Long imageId) {
        Image image = imageRepository.findById(imageId)
            .orElseThrow(() -> new RuntimeException("Image not found: " + imageId));
        return Paths.get(image.getPath());
    }

    public byte[] getImageBytes(Long imageId) throws IOException {
        Path path = getImagePath(imageId);
        return Files.readAllBytes(path);
    }

    /* ==================== Utilities ==================== */

    private String getFileExtension(String fileName) {
        if (fileName == null || !fileName.contains(".")) {
            return "jpg";
        }
        return fileName.substring(fileName.lastIndexOf(".") + 1);
    }
}
