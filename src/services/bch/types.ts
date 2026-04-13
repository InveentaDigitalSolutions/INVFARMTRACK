/**
 * BCH API Type Definitions
 * Banco Central de Honduras — Exchange Rate API
 */

/** Indicator metadata from GET /indicadores/{id} */
export interface BchIndicator {
  Id: number;
  Nombre: string;
  Descripcion: string;
  Periodicidad: string;
  Grupo: string;
}

/** Figure/data point from GET /indicadores/{id}/cifras */
export interface BchFigure {
  Id: number;
  IndicadorId: number;
  Nombre: string;
  Descripcion: string;
  Fecha: string;
  Valor: number;
}

/** Parsed exchange rate result */
export interface ExchangeRate {
  /** Date of the rate */
  date: Date;
  /** HNL per 1 USD */
  value: number;
  /** ISO date string (YYYY-MM-DD) */
  dateISO: string;
}

/** Historical exchange rate series */
export interface ExchangeRateSeries {
  rates: ExchangeRate[];
  indicatorId: number;
  indicatorName: string;
}

/** Custom error types */
export class BchUnauthorizedError extends Error {
  constructor(message = "Invalid or missing BCH API subscription key") {
    super(message);
    this.name = "BchUnauthorizedError";
  }
}

export class BchForbiddenError extends Error {
  constructor(message = "BCH API subscription not approved") {
    super(message);
    this.name = "BchForbiddenError";
  }
}

export class BchRateLimitError extends Error {
  constructor(message = "BCH API rate limit exceeded") {
    super(message);
    this.name = "BchRateLimitError";
  }
}

export class BchApiError extends Error {
  public statusCode: number;
  constructor(statusCode: number, message: string) {
    super(message);
    this.name = "BchApiError";
    this.statusCode = statusCode;
  }
}
