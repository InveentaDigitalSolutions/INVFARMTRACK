/**
 * BCH Exchange Rate — Public API
 *
 * Usage:
 *   import { bchClient, useExchangeRate } from "../services/bch";
 *   const { rate, loading, error } = useExchangeRate();
 */

export { BchApiClient } from "./BchApiClient";
export { BCH_CONFIG } from "./config";
export type {
  ExchangeRate,
  ExchangeRateSeries,
  BchIndicator,
  BchFigure,
} from "./types";
export {
  BchUnauthorizedError,
  BchForbiddenError,
  BchRateLimitError,
  BchApiError,
} from "./types";

import { BchApiClient } from "./BchApiClient";

// Singleton client — reads key from env var
const BCH_API_KEY = import.meta.env.VITE_BCH_API_KEY || "";

/** Singleton BCH API client (null if no key configured) */
export const bchClient = BCH_API_KEY ? new BchApiClient(BCH_API_KEY) : null;
