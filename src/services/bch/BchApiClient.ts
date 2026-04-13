/**
 * BchApiClient — Banco Central de Honduras Exchange Rate API Client
 *
 * Retrieves the official USD/HNL Reference Exchange Rate (TCR).
 * Authenticated via subscription key in the "clave" header.
 *
 * Features:
 * - getReferenceExchangeRate() — latest daily rate with 6h cache
 * - getHistoricalExchangeRate(from, to) — date range series
 * - Exponential backoff retry for 429/5xx
 * - Structured logging (never logs the key)
 * - 10s request timeout
 */

import { BCH_CONFIG } from "./config";
import type {
  BchFigure,
  BchIndicator,
  ExchangeRate,
  ExchangeRateSeries,
} from "./types";
import {
  BchUnauthorizedError,
  BchForbiddenError,
  BchRateLimitError,
  BchApiError,
} from "./types";

interface CacheEntry {
  rate: ExchangeRate;
  fetchedAt: number;
}

interface LogEntry {
  timestamp: string;
  endpoint: string;
  status: number;
  latencyMs: number;
  error?: string;
}

export class BchApiClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private cache: CacheEntry | null = null;
  private logs: LogEntry[] = [];

  /**
   * Create a new BCH API Client.
   * @param apiKey - BCH subscription key (injected, never hardcoded)
   * @param baseUrl - API base URL (optional override for testing)
   */
  constructor(apiKey: string, baseUrl?: string) {
    if (!apiKey) {
      throw new Error("BCH API key is required");
    }
    this.apiKey = apiKey;
    this.baseUrl = baseUrl ?? BCH_CONFIG.baseUrl;
  }

  /**
   * Get the most recent Reference Exchange Rate (TCR).
   * Returns cached value if within TTL (6 hours).
   * @returns The latest exchange rate (HNL per 1 USD)
   */
  async getReferenceExchangeRate(): Promise<ExchangeRate> {
    // Check cache
    if (this.cache && Date.now() - this.cache.fetchedAt < BCH_CONFIG.cacheTtlMs) {
      return this.cache.rate;
    }

    const figures = await this.fetchFigures(BCH_CONFIG.tcrIndicatorId);

    if (figures.length === 0) {
      throw new BchApiError(404, "No exchange rate data available");
    }

    // Sort by date descending, take the latest
    figures.sort((a, b) => new Date(b.Fecha).getTime() - new Date(a.Fecha).getTime());
    const latest = figures[0];

    const rate: ExchangeRate = {
      date: new Date(latest.Fecha),
      value: latest.Valor,
      dateISO: latest.Fecha.slice(0, 10),
    };

    // Update cache
    this.cache = { rate, fetchedAt: Date.now() };

    return rate;
  }

  /**
   * Get historical exchange rates for a date range.
   * @param from - Start date (inclusive). If omitted, returns all available.
   * @param to - End date (inclusive). If omitted, returns up to today.
   * @returns Sorted series of exchange rates
   */
  async getHistoricalExchangeRate(from?: Date, to?: Date): Promise<ExchangeRateSeries> {
    const figures = await this.fetchFigures(BCH_CONFIG.tcrIndicatorId);

    let filtered = figures;
    if (from) {
      const fromTime = from.getTime();
      filtered = filtered.filter((f) => new Date(f.Fecha).getTime() >= fromTime);
    }
    if (to) {
      const toTime = to.getTime() + 86400000; // Include the end date
      filtered = filtered.filter((f) => new Date(f.Fecha).getTime() < toTime);
    }

    // Sort ascending by date
    filtered.sort((a, b) => new Date(a.Fecha).getTime() - new Date(b.Fecha).getTime());

    return {
      rates: filtered.map((f) => ({
        date: new Date(f.Fecha),
        value: f.Valor,
        dateISO: f.Fecha.slice(0, 10),
      })),
      indicatorId: BCH_CONFIG.tcrIndicatorId,
      indicatorName: "EC-TCR-01",
    };
  }

  /**
   * Get indicator metadata.
   * @param id - Indicator ID
   */
  async getIndicatorInfo(id: number = BCH_CONFIG.tcrIndicatorId): Promise<BchIndicator> {
    const data = await this.request<BchIndicator>(`/indicadores/${id}?formato=Json`);
    return data;
  }

  /**
   * Get access logs (for debugging — never contains the API key).
   */
  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  /** Clear the cached rate (force fresh fetch) */
  clearCache(): void {
    this.cache = null;
  }

  // ===================== Private methods =====================

  /**
   * Fetch figures for an indicator with retry logic.
   */
  private async fetchFigures(indicatorId: number): Promise<BchFigure[]> {
    return this.request<BchFigure[]>(`/indicadores/${indicatorId}/cifras?formato=Json`);
  }

  /**
   * Make an authenticated request with timeout, retry, and error handling.
   */
  private async request<T>(path: string, attempt = 1): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const startTime = Date.now();

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), BCH_CONFIG.timeoutMs);

      const response = await fetch(url, {
        method: "GET",
        headers: {
          [BCH_CONFIG.authHeader]: this.apiKey,
          "Cache-Control": "no-cache",
          Accept: "application/json",
        },
        signal: controller.signal,
      });

      clearTimeout(timeout);

      const latencyMs = Date.now() - startTime;
      this.log(path, response.status, latencyMs);

      // Handle error status codes
      if (!response.ok) {
        switch (response.status) {
          case 401:
            throw new BchUnauthorizedError();
          case 403:
            throw new BchForbiddenError();
          case 429:
            if (attempt <= BCH_CONFIG.maxRetries) {
              const delay = BCH_CONFIG.retryBaseDelayMs * Math.pow(2, attempt - 1);
              await this.sleep(delay);
              return this.request<T>(path, attempt + 1);
            }
            throw new BchRateLimitError();
          default:
            if (response.status >= 500 && attempt <= BCH_CONFIG.maxRetries) {
              const delay = BCH_CONFIG.retryBaseDelayMs * Math.pow(2, attempt - 1);
              await this.sleep(delay);
              return this.request<T>(path, attempt + 1);
            }
            throw new BchApiError(response.status, `BCH API error: ${response.statusText}`);
        }
      }

      const data = await response.json();
      return data as T;
    } catch (error) {
      const latencyMs = Date.now() - startTime;

      if (error instanceof BchUnauthorizedError || error instanceof BchForbiddenError ||
          error instanceof BchRateLimitError || error instanceof BchApiError) {
        throw error;
      }

      // AbortError = timeout
      if (error instanceof DOMException && error.name === "AbortError") {
        this.log(path, 0, latencyMs, "Request timeout");
        if (attempt <= BCH_CONFIG.maxRetries) {
          return this.request<T>(path, attempt + 1);
        }
        throw new BchApiError(0, `BCH API request timed out after ${BCH_CONFIG.timeoutMs}ms`);
      }

      // Network error
      this.log(path, 0, latencyMs, String(error));
      throw new BchApiError(0, `BCH API network error: ${error}`);
    }
  }

  /**
   * Log a request (never logs the API key).
   */
  private log(endpoint: string, status: number, latencyMs: number, error?: string): void {
    this.logs.push({
      timestamp: new Date().toISOString(),
      endpoint,
      status,
      latencyMs,
      error,
    });
    // Keep only last 100 logs
    if (this.logs.length > 100) {
      this.logs = this.logs.slice(-100);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
