"""Kalshi Research Client for historical backtests, market insights, and consensus comparison.

Uses the Kalshi Trade API v2 (https://docs.kalshi.com) to fetch:
- Historical market data and candlesticks for backtesting
- Market/event insights and analytics
- Consensus pricing data for position comparison

Note: research.kalshi.com is a research publication site; the actual data API
is at api.kalshi.com/trade-api/v2/.
"""

from __future__ import annotations

import hashlib
import hmac
import time
from dataclasses import dataclass, field
from typing import Any, Optional

import requests

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

PRODUCTION_BASE_URL = "https://api.kalshi.com/trade-api/v2"
DEMO_BASE_URL = "https://demo-api.kalshi.com/trade-api/v2"

# ---------------------------------------------------------------------------
# Data classes
# ---------------------------------------------------------------------------


@dataclass
class CandlesResult:
    """Candlestick data for a single market."""

    ticker: str
    candles: list[dict[str, Any]]


@dataclass
class BacktestResult:
    """Result of a backtest run over historical markets."""

    series_ticker: str
    total_markets: int
    markets: list[dict[str, Any]]
    candlesticks: dict[str, list[dict[str, Any]]]  # ticker -> candles
    summary: dict[str, Any] = field(default_factory=dict)


@dataclass
class MarketInsight:
    """Insight derived from market data."""

    ticker: str
    event_ticker: str
    title: str
    yes_price: Optional[float]
    no_price: Optional[float]
    volume: int
    open_interest: int
    status: str
    category: Optional[str] = None
    close_time: Optional[str] = None
    result: Optional[str] = None


@dataclass
class ConsensusComparison:
    """Comparison of a position or prediction against market consensus."""

    ticker: str
    your_prediction: float
    consensus_price: float
    edge: float  # your_prediction - consensus_price
    direction: str  # "agree" | "fading_consensus" | "with_consensus"
    volume: int
    open_interest: int


# ---------------------------------------------------------------------------
# Client
# ---------------------------------------------------------------------------


class KalshiResearchClient:
    """Client for Kalshi research-oriented API operations.

    Provides methods for fetching historical backtest data, market insights,
    and comparing predictions to market consensus.

    Parameters
    ----------
    access_key : str | None
        Kalshi API access key. Required for authenticated endpoints.
    private_key : str | None
        Kalshi API private key (PEM). Required for authenticated endpoints.
    demo : bool
        If True, use the demo API base URL.
    session : requests.Session | None
        Optional pre-configured session.
    """

    def __init__(
        self,
        access_key: Optional[str] = None,
        private_key: Optional[str] = None,
        demo: bool = False,
        session: Optional[requests.Session] = None,
    ) -> None:
        self.base_url = DEMO_BASE_URL if demo else PRODUCTION_BASE_URL
        self.access_key = access_key
        self.private_key = private_key
        self.session = session or requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})

    # -- Auth helpers -------------------------------------------------------

    def _sign_request(self, method: str, path: str, timestamp: str) -> str:
        """Generate HMAC-SHA256 signature for authenticated requests."""
        if not self.private_key:
            raise ValueError("private_key is required for authenticated endpoints")
        message = f"{timestamp}{method}{path}"
        sig = hmac.new(
            self.private_key.encode(),
            message.encode(),
            hashlib.sha256,
        ).hexdigest()
        return sig

    def _auth_headers(self, method: str, path: str) -> dict[str, str]:
        """Build authentication headers."""
        if not self.access_key or not self.private_key:
            return {}
        timestamp = str(int(time.time() * 1000))
        signature = self._sign_request(method, path, timestamp)
        return {
            "KALSHI-ACCESS-KEY": self.access_key,
            "KALSHI-ACCESS-SIGNATURE": signature,
            "KALSHI-ACCESS-TIMESTAMP": timestamp,
        }

    # -- Low-level request --------------------------------------------------

    def _request(self, method: str, path: str, params: Optional[dict] = None) -> dict:
        """Make an HTTP request to the Kalshi API.

        Public endpoints need no auth. Private ones get signed headers.
        """
        url = f"{self.base_url}{path}"
        headers = {}
        if self.access_key and self.private_key:
            headers.update(self._auth_headers(method, path))

        resp = self.session.request(method, url, params=params, headers=headers, timeout=30)
        resp.raise_for_status()
        return resp.json()

    # -- Public endpoints ---------------------------------------------------

    def get_cutoff(self) -> dict[str, Any]:
        """Get the current cutoff timestamps for live vs historical data."""
        return self._request("GET", "/historical/cutoff")

    # -- Historical / backtest data -----------------------------------------

    def get_historical_markets(
        self,
        series_ticker: Optional[str] = None,
        status: str = "settled",
        limit: int = 100,
        cursor: Optional[str] = None,
    ) -> dict[str, Any]:
        """Fetch historical (settled) markets.

        Parameters
        ----------
        series_ticker : str | None
            Filter by series ticker (e.g. ``"KXHIGHNY"``).
        status : str
            Market status filter. Default ``"settled"``.
        limit : int
            Max results per page.
        cursor : str | None
            Pagination cursor.
        """
        params: dict[str, Any] = {"limit": limit}
        if series_ticker:
            params["series_ticker"] = series_ticker
        if status:
            params["status"] = status
        if cursor:
            params["cursor"] = cursor
        return self._request("GET", "/historical/markets", params=params)

    def get_market_candlesticks(
        self,
        ticker: str,
        period_interval: int = 60,
        start_ts: Optional[int] = None,
        end_ts: Optional[int] = None,
    ) -> CandlesResult:
        """Fetch candlestick data for a historical market.

        Parameters
        ----------
        ticker : str
            Market ticker.
        period_interval : int
            Candle period in minutes (1, 60, 1440).
        start_ts : int | None
            Start timestamp (unix seconds).
        end_ts : int | None
            End timestamp (unix seconds).
        """
        params: dict[str, Any] = {"period_interval": period_interval}
        if start_ts is not None:
            params["start_ts"] = start_ts
        if end_ts is not None:
            params["end_ts"] = end_ts

        data = self._request("GET", f"/historical/markets/{ticker}/candlesticks", params=params)
        return CandlesResult(ticker=ticker, candles=data.get("candlesticks", []))

    def get_live_markets(
        self,
        series_ticker: Optional[str] = None,
        status: Optional[str] = None,
        limit: int = 100,
        cursor: Optional[str] = None,
    ) -> dict[str, Any]:
        """Fetch live (recent) markets from the standard API."""
        params: dict[str, Any] = {"limit": limit}
        if series_ticker:
            params["series_ticker"] = series_ticker
        if status:
            params["status"] = status
        if cursor:
            params["cursor"] = cursor
        return self._request("GET", "/markets", params=params)

    def get_events(
        self,
        series_ticker: Optional[str] = None,
        status: Optional[str] = None,
        limit: int = 100,
        with_nested_markets: bool = True,
        cursor: Optional[str] = None,
    ) -> dict[str, Any]:
        """Fetch events (groups of related markets)."""
        params: dict[str, Any] = {
            "limit": limit,
            "with_nested_markets": str(with_nested_markets).lower(),
        }
        if series_ticker:
            params["series_ticker"] = series_ticker
        if status:
            params["status"] = status
        if cursor:
            params["cursor"] = cursor
        return self._request("GET", "/events", params=params)

    def get_series(self) -> dict[str, Any]:
        """Fetch all available series (market categories)."""
        return self._request("GET", "/series")

    def get_market(self, ticker: str) -> dict[str, Any]:
        """Fetch a single market by ticker."""
        return self._request("GET", f"/markets/{ticker}")

    def get_market_orderbook(self, ticker: str, depth: int = 10) -> dict[str, Any]:
        """Fetch the current orderbook for a market."""
        return self._request("GET", f"/markets/{ticker}/orderbook", params={"depth": depth})

    # -- High-level research methods ----------------------------------------

    def get_backtests(
        self,
        series_ticker: str,
        start_ts: Optional[int] = None,
        end_ts: Optional[int] = None,
        period_interval: int = 60,
        limit: int = 50,
    ) -> BacktestResult:
        """Run a historical backtest over settled markets for a series.

        Fetches settled markets for the given series and their candlestick data,
        returning a structured result suitable for strategy analysis.

        Parameters
        ----------
        series_ticker : str
            The series to backtest (e.g. ``"KXHIGHNY"``).
        start_ts : int | None
            Optional start timestamp for candlesticks.
        end_ts : int | None
            Optional end timestamp for candlesticks.
        period_interval : int
            Candle period in minutes.
        limit : int
            Max number of settled markets to include.

        Returns
        -------
        BacktestResult
            Structured result with market data and candlesticks.
        """
        hist = self.get_historical_markets(
            series_ticker=series_ticker, status="settled", limit=limit
        )
        markets = hist.get("markets", [])

        candlesticks: dict[str, list[dict[str, Any]]] = {}
        total_volume = 0
        total_yes_close = 0.0
        count_with_close = 0

        for m in markets:
            ticker = m["ticker"]
            try:
                candles = self.get_market_candlesticks(
                    ticker=ticker,
                    period_interval=period_interval,
                    start_ts=start_ts,
                    end_ts=end_ts,
                )
                candlesticks[ticker] = candles.candles
            except requests.HTTPError:
                candlesticks[ticker] = []

            vol = m.get("volume", 0) or 0
            total_volume += vol
            result = m.get("result")
            if result == "yes":
                total_yes_close += 1.0
                count_with_close += 1
            elif result == "no":
                count_with_close += 1

        summary: dict[str, Any] = {
            "total_volume": total_volume,
            "avg_volume": total_volume / len(markets) if markets else 0,
            "resolved_yes_pct": (
                (total_yes_close / count_with_close * 100) if count_with_close else None
            ),
        }

        return BacktestResult(
            series_ticker=series_ticker,
            total_markets=len(markets),
            markets=markets,
            candlesticks=candlesticks,
            summary=summary,
        )

    def get_insights(
        self,
        series_ticker: Optional[str] = None,
        status: Optional[str] = None,
        limit: int = 100,
    ) -> list[MarketInsight]:
        """Get market insights by combining live market and event data.

        Aggregates price, volume, open interest, and metadata for each market,
        returning a list of structured insight objects.

        Parameters
        ----------
        series_ticker : str | None
            Filter by series ticker.
        status : str | None
            Filter by market status (e.g. ``"open"``, ``"closed"``).
        limit : int
            Max number of markets to fetch.

        Returns
        -------
        list[MarketInsight]
            Insights for each market.
        """
        data = self.get_live_markets(series_ticker=series_ticker, status=status, limit=limit)
        raw_markets = data.get("markets", [])

        insights: list[MarketInsight] = []
        for m in raw_markets:
            yes_price = m.get("yes_price")
            no_price = m.get("no_price")

            # Normalize prices from cents to probability (0-1)
            yes_prob = yes_price / 100.0 if yes_price is not None else None
            no_prob = no_price / 100.0 if no_price is not None else None

            insights.append(
                MarketInsight(
                    ticker=m.get("ticker", ""),
                    event_ticker=m.get("event_ticker", ""),
                    title=m.get("title", ""),
                    yes_price=yes_prob,
                    no_price=no_prob,
                    volume=m.get("volume", 0) or 0,
                    open_interest=m.get("open_interest", 0) or 0,
                    status=m.get("status", ""),
                    close_time=m.get("close_time"),
                    result=m.get("result"),
                )
            )

        return insights

    def compare_to_consensus(
        self,
        predictions: dict[str, float],
        series_ticker: Optional[str] = None,
    ) -> list[ConsensusComparison]:
        """Compare user predictions against current market consensus prices.

        Parameters
        ----------
        predictions : dict[str, float]
            Mapping of market ticker to your predicted probability (0-1).
        series_ticker : str | None
            If provided, only compare against markets in this series.

        Returns
        -------
        list[ConsensusComparison]
            Comparison results with edge calculation for each ticker.
        """
        # Batch fetch market data for all tickers in predictions
        comparisons: list[ConsensusComparison] = []

        for ticker, your_pred in predictions.items():
            try:
                market = self.get_market(ticker)
            except requests.HTTPError:
                continue

            yes_price = market.get("yes_price")
            consensus = yes_price / 100.0 if yes_price is not None else 0.5
            edge = your_pred - consensus

            if abs(edge) < 0.01:
                direction = "agree"
            elif edge > 0:
                direction = "with_consensus"
            else:
                direction = "fading_consensus"

            comparisons.append(
                ConsensusComparison(
                    ticker=ticker,
                    your_prediction=your_pred,
                    consensus_price=consensus,
                    edge=round(edge, 4),
                    direction=direction,
                    volume=market.get("volume", 0) or 0,
                    open_interest=market.get("open_interest", 0) or 0,
                )
            )

        return comparisons
