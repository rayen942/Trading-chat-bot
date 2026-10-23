"""Live market data — fetched from CoinGecko (no API key required).

Prices are cached in-process for a short TTL so we don't hammer the public API
on every chat message or dashboard refresh. The chat blueprint injects a snapshot
into Claude's context so replies reference real, current prices instead of guesses.
"""

import json
import time
import urllib.request
import urllib.error

# Symbol shown in the UI  ->  (CoinGecko id, human-readable name)
COIN_MAP = {
    "BTC":  ("bitcoin",       "Bitcoin"),
    "ETH":  ("ethereum",      "Ethereum"),
    "SOL":  ("solana",        "Solana"),
    "ADA":  ("cardano",       "Cardano"),
    "XRP":  ("ripple",        "XRP"),
    "DOGE": ("dogecoin",      "Dogecoin"),
    "BNB":  ("binancecoin",   "BNB"),
    "DOT":  ("polkadot",      "Polkadot"),
    "AVAX": ("avalanche-2",   "Avalanche"),
    "MATIC":("matic-network", "Polygon"),
    "LINK": ("chainlink",     "Chainlink"),
    "LTC":  ("litecoin",      "Litecoin"),
}

_COINGECKO_URL = (
    "https://api.coingecko.com/api/v3/simple/price"
    "?ids={ids}&vs_currencies=usd&include_24hr_change=true"
)

CACHE_TTL_SECONDS = 60  # how long a fetched snapshot stays "fresh"
_cache = {"ts": 0.0, "data": []}


def _fetch_from_coingecko() -> list[dict]:
    """Hit CoinGecko once and return a list of price dicts. Raises on failure."""
    ids = ",".join(cid for cid, _ in COIN_MAP.values())
    url = _COINGECKO_URL.format(ids=ids)
    req = urllib.request.Request(url, headers={"User-Agent": "MoneyTrade-AI/1.0"})
    with urllib.request.urlopen(req, timeout=8) as resp:
        raw = json.loads(resp.read().decode("utf-8"))

    snapshot = []
    for symbol, (cid, name) in COIN_MAP.items():
        entry = raw.get(cid)
        if not entry or entry.get("usd") is None:
            continue
        snapshot.append(
            {
                "symbol": symbol,
                "name": name,
                "price": round(float(entry["usd"]), 4),
                "change24h": round(float(entry.get("usd_24h_change", 0.0)), 2),
            }
        )
    return snapshot


def get_market_snapshot(force: bool = False) -> list[dict]:
    """Return live crypto prices, using the cached copy if it's still fresh.

    On a network/API error we fall back to the last good cache (possibly stale)
    rather than failing the caller — chat and the dashboard keep working.
    """
    now = time.time()
    if not force and _cache["data"] and (now - _cache["ts"]) < CACHE_TTL_SECONDS:
        return _cache["data"]
    try:
        data = _fetch_from_coingecko()
        if data:
            _cache["data"] = data
            _cache["ts"] = now
        return data or _cache["data"]
    except (urllib.error.URLError, ValueError, TimeoutError, OSError):
        # Network hiccup or bad payload — serve whatever we last had.
        return _cache["data"]


def get_price(symbol: str) -> float | None:
    """Convenience: current USD price for one symbol, or None if unknown."""
    symbol = (symbol or "").upper()
    for row in get_market_snapshot():
        if row["symbol"] == symbol:
            return row["price"]
    return None


def market_context_block() -> str:
    """A compact, text block of live prices to inject into the chat context."""
    snapshot = get_market_snapshot()
    if not snapshot:
        return ""
    lines = ["\n\n[LIVE CRYPTO PRICES - real-time from CoinGecko, use these exact numbers]"]
    for row in snapshot:
        trend = "up" if row["change24h"] >= 0 else "down"
        lines.append(
            f"  - {row['symbol']} ({row['name']}): ${row['price']:,} "
            f"({row['change24h']:+.2f}% 24h, trending {trend})"
        )
    return "\n".join(lines)
