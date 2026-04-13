/**
 * BCH API Configuration
 * Banco Central de Honduras — Exchange Rate API
 */

export const BCH_CONFIG = {
  /** API base URL (Azure API Management) */
  baseUrl: "https://bchapi-am.azure-api.net/api/v1",

  /** Developer portal */
  devPortal: "https://bchapi-am.developer.azure-api.net",

  /** Authentication header name (BCH uses "clave", NOT "Ocp-Apim-Subscription-Key") */
  authHeader: "clave",

  /** Indicator ID for Reference Exchange Rate (TCR) */
  tcrIndicatorId: 97,

  /** Request timeout in milliseconds */
  timeoutMs: 10_000,

  /** Cache TTL in milliseconds (6 hours — TCR published once per day) */
  cacheTtlMs: 6 * 60 * 60 * 1000,

  /** Max retry attempts for 429/5xx errors */
  maxRetries: 3,

  /** Base delay for exponential backoff (ms) */
  retryBaseDelayMs: 1_000,
} as const;
