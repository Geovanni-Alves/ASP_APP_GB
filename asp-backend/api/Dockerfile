# Etapa 1: compila o projeto (nao precisa ter Java instalado no PC)
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn -q dependency:go-offline
COPY src ./src
RUN mvn -q package -DskipTests

# Etapa 2: roda a API
FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app/target/asp-api.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
