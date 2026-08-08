/* 台股報價 · 多來源備援 */
const PROXIES = [
  u => 'https://api.allorigins.win/raw?url=' + encodeURIComponent(u),
  u => 'https://corsproxy.io/?' + encodeURIComponent(u),
  u => 'https://api.codetabs.com/v1/proxy?quest=' + encodeURIComponent(u),
];

// 從 Yahoo Finance 抓（.TW 上市 / .TWO 上櫃）
async function fetchQuote(code) {
  const sufs = ['.TW', '.TWO'];
  for (const suf of sufs) {
    const target = `https://query1.finance.yahoo.com/v8/finance/chart/${code}${suf}`;
    for (const px of PROXIES) {
      try {
        const res = await fetch(px(target), { signal: AbortSignal.timeout(9000) });
        if (!res.ok) continue;
        const j = await res.json();
        const m = j?.chart?.result?.[0]?.meta;
        if (m?.regularMarketPrice) {
          return {
            price: m.regularMarketPrice,
            prev: m.previousClose || m.chartPreviousClose,
            name: m.shortName || m.longName || '',
            market: suf === '.TW' ? '上市' : '上櫃',
          };
        }
      } catch (e) { /* 換下一個 */ }
    }
  }
  return null;
}

async function updateAllPrices(onProgress) {
  let ok = 0, fail = [];
  for (let i = 0; i < D.stocks.length; i++) {
    const s = D.stocks[i];
    if (onProgress) onProgress(i + 1, D.stocks.length, s.code);
    const q = await fetchQuote(s.code);
    if (q) {
      s.price = q.price;
      s.prevClose = q.prev;
      s.updated = new Date().toISOString();
      if (!s.name && q.name) s.name = q.name;
      ok++;
    } else fail.push(s.code);
  }
  save();
  return { ok, fail };
}
