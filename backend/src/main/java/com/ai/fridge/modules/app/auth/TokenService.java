package com.ai.fridge.modules.app.auth;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;
import javax.crypto.SecretKey;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class TokenService {

  private static final String TOKEN_TYPE_CLAIM = "type";

  private final SecretKey secretKey;
  private final String issuer;
  private final long accessTokenExpirationMinutes;
  private final long refreshTokenExpirationDays;

  public TokenService(
      @Value("${app.auth.jwt.secret}") String secret,
      @Value("${app.auth.jwt.issuer}") String issuer,
      @Value("${app.auth.jwt.access-token-expiration-minutes}") long accessTokenExpirationMinutes,
      @Value("${app.auth.jwt.refresh-token-expiration-days}") long refreshTokenExpirationDays) {
    this.secretKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    this.issuer = issuer;
    this.accessTokenExpirationMinutes = accessTokenExpirationMinutes;
    this.refreshTokenExpirationDays = refreshTokenExpirationDays;
  }

  public String generateAccessToken(Long userId, String email) {
    Instant issuedAt = Instant.now();
    Instant expiresAt = issuedAt.plus(accessTokenExpirationMinutes, ChronoUnit.MINUTES);

    return Jwts.builder()
        .subject(String.valueOf(userId))
        .issuer(issuer)
        .claim("email", email)
        .claim(TOKEN_TYPE_CLAIM, "access")
        .issuedAt(Date.from(issuedAt))
        .expiration(Date.from(expiresAt))
        .signWith(secretKey)
        .compact();
  }

  public String generateRefreshToken(Long userId, String email) {
    Instant issuedAt = Instant.now();
    Instant expiresAt = issuedAt.plus(refreshTokenExpirationDays, ChronoUnit.DAYS);

    return Jwts.builder()
        .subject(String.valueOf(userId))
        .issuer(issuer)
        .claim("email", email)
        .claim(TOKEN_TYPE_CLAIM, "refresh")
        .issuedAt(Date.from(issuedAt))
        .expiration(Date.from(expiresAt))
        .signWith(secretKey)
        .compact();
  }

  public Long parseUserId(String token, String expectedType) {
    try {
      Claims claims = parseClaims(token);
      String tokenType = claims.get(TOKEN_TYPE_CLAIM, String.class);
      if (tokenType == null || !tokenType.equalsIgnoreCase(expectedType)) {
        return null;
      }

      return Long.parseLong(claims.getSubject());
    } catch (Exception exception) {
      return null;
    }
  }

  public Long parseUserId(String token) {
    try {
      Claims claims = parseClaims(token);
      return Long.parseLong(claims.getSubject());
    } catch (Exception exception) {
      return null;
    }
  }

  public Instant parseExpiration(String token) {
    Claims claims = parseClaims(token);
    Date expiresAt = claims.getExpiration();
    return expiresAt.toInstant();
  }

  private Claims parseClaims(String token) {
    return Jwts.parser().verifyWith(secretKey).build().parseSignedClaims(token).getPayload();
  }

  public boolean isTokenExpired(String token) {
    try {
      Claims claims = parseClaims(token);
      Date expiration = claims.getExpiration();
      return expiration.before(new Date());
    } catch (Exception exception) {
      return true;
    }
  }

  // tokenService.parseUserIdFromInviteCode(normalizedCode);
  public Long parseUserIdFromInviteCode(String inviteCode) {
    try {
      Claims claims = parseClaims(inviteCode);
      return Long.parseLong(claims.getSubject());
    } catch (Exception exception) {
      return null;
    }
  }
}
