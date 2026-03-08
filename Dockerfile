# =========================
# 1. Build stage
# =========================
FROM eclipse-temurin:17-jdk-alpine AS build

WORKDIR /app

# Gradle Wrapper 복사 (캐시 최적화)
COPY gradlew .
COPY gradle gradle
COPY build.gradle settings.gradle ./

RUN chmod +x gradlew
RUN ./gradlew dependencies --no-daemon

# 소스 복사 후 빌드
COPY src src
RUN ./gradlew bootJar --no-daemon -x test


# =========================
# 2. Runtime stage
# =========================
FROM eclipse-temurin:17-jre-alpine

WORKDIR /app

# 타임존 설정
RUN apk add --no-cache tzdata \
 && cp /usr/share/zoneinfo/Asia/Seoul /etc/localtime \
 && echo "Asia/Seoul" > /etc/timezone \
 && apk del tzdata

# 비루트 유저
RUN addgroup -g 1000 -S spring && adduser -u 1000 -S spring -G spring
# create /drive directory for image storage and adjust permissions
RUN mkdir -p /drive/images \
 && chown -R spring:spring /drive \
 && chmod -R 755 /drive

# RUN addgroup -S spring && adduser -S spring -G spring
USER spring:spring

# JAR 복사
COPY --from=build /app/build/libs/*.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-Dspring.profiles.active=prod", "-jar", "app.jar"]