FROM maven:3.9-eclipse-temurin-17 AS builder

WORKDIR /build

COPY pom.xml .

RUN mvn -q -B dependency:go-offline

COPY src ./src

RUN mvn -q -B clean package -DskipTests=true -Dspotless.check.skip=true

RUN test -f target/*.jar || (echo "JAR not found!" && exit 1)

FROM eclipse-temurin:17-jre-alpine

LABEL maintainer="Fridge AI Team"
LABEL description="Fridge AI - Spring Boot Backend Service"
LABEL version="1.0.0"

RUN apk add --no-cache \
    ca-certificates \
    curl \
    && rm -rf /var/cache/apk/*

RUN addgroup -S spring && adduser -S spring -G spring

WORKDIR /app

COPY --from=builder --chown=spring:spring /build/target/*.jar app.jar

ENV JAVA_OPTS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0 -XX:+ExitOnOutOfMemoryError"

EXPOSE 8080

USER spring

HEALTHCHECK --interval=30s --timeout=10s --retries=3 --start-period=40s \
    CMD curl -f http://localhost:8080/actuator/health || exit 1

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]

