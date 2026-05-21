package com.ai.fridge.modules.app.auth;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class GoogleIdentityService {

  private static final String TOKEN_INFO_ENDPOINT =
      "https://oauth2.googleapis.com/tokeninfo?id_token=";

  private final HttpClient httpClient;
  private final ObjectMapper objectMapper;
  private final String configuredClientId;

  public GoogleIdentityService(
      ObjectMapper objectMapper,
      @Value("${app.auth.google.client-id:}") String configuredClientId) {
    this.httpClient = HttpClient.newHttpClient();
    this.objectMapper = objectMapper;
    this.configuredClientId = configuredClientId;
  }

  public GoogleUser verifyIdToken(String idToken) {
    if (idToken == null || idToken.isBlank()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Google ID token is required");
    }

    try {
      String encodedToken = URLEncoder.encode(idToken, StandardCharsets.UTF_8);
      HttpRequest request =
          HttpRequest.newBuilder()
              .uri(URI.create(TOKEN_INFO_ENDPOINT + encodedToken))
              .GET()
              .build();

      HttpResponse<String> response =
          httpClient.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));

      if (response.statusCode() >= 400) {
        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid Google token");
      }

      JsonNode body = objectMapper.readTree(response.body());
      String audience = textOrNull(body, "aud");
      if (configuredClientId != null
          && !configuredClientId.isBlank()
          && audience != null
          && !configuredClientId.equals(audience)) {
        throw new ResponseStatusException(
            HttpStatus.UNAUTHORIZED, "Google token audience mismatch");
      }

      String email = textOrNull(body, "email");
      String sub = textOrNull(body, "sub");
      String name = textOrNull(body, "name");
      boolean emailVerified = "true".equalsIgnoreCase(textOrNull(body, "email_verified"));

      if (email == null || sub == null) {
        throw new ResponseStatusException(
            HttpStatus.UNAUTHORIZED, "Google token missing required claims");
      }

      return new GoogleUser(sub, email.toLowerCase().trim(), name, emailVerified);
    } catch (IOException | InterruptedException exception) {
      throw new ResponseStatusException(
          HttpStatus.SERVICE_UNAVAILABLE, "Cannot verify Google token");
    }
  }

  private String textOrNull(JsonNode body, String fieldName) {
    JsonNode value = body.get(fieldName);
    if (value == null || value.isNull()) {
      return null;
    }
    return value.asText();
  }

  public record GoogleUser(String sub, String email, String name, boolean emailVerified) {}
}
