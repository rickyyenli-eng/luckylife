/* 台股報價 · 歷史報酬 · 股利 */
const PROXIES = [
  u => 'https://api.allorigins.win/raw?url=' + encodeURIComponent(u),
  u => 'https://corsproxy.io/?' + encodeURIComponent(u),
  u => 'https://api.codetabs.com/v1/proxy?quest=' + encodeURIComponent(u),
];
async function tryFetch(target) {
  for (const px of PROXIES) {
    try {
      const r = await fetch(px(target), { signal: AbortSignal.timeout(12000) });
      if (r.ok) return await r.json();
    } catch (e) {}
  }
  return null;
}

/* 一次抓齊：現價 / 名稱 / 10年CAGR / 股利歷史 / 最近除息 */
async function fetchFull(code) {
  for (const suf of ['.TW', '.TWO']) {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${code}${suf}?range=10y&interval=1mo&events=div`;
    const j = await tryFetch(url);
    const res = j?.chart?.result?.[0];
    if (!res?.meta?.regularMarketPrice) continue;
    const m = res.meta;
    const out = {
      price: m.regularMarketPrice,
      prev: m.previousClose || m.chartPreviousClose,
      name: (m.shortName || m.longName || '').trim(),
      market: suf === '.TW' ? '上市' : '上櫃',
    };
    // 價格 CAGR
    const ts = res.timestamp || [], cl = res.indicators?.quote?.[0]?.close || [];
    const v = [];
    for (let i = 0; i < ts.length; i++) if (cl[i]) v.push([ts[i], cl[i]]);
    if (v.length > 24) {
      const yrs = (v[v.length - 1][0] - v[0][0]) / 86400 / 365.25;
      out.years = yrs;
      out.cagr = (Math.pow(v[v.length - 1][1] / v[0][1], 1 / yrs) - 1) * 100;
      out.low = Math.min(...v.map(x => x[1]));
      out.high = Math.max(...v.map(x => x[1]));
    }
    // 股利
    const dv = res.events?.dividends || {};
    const dl = Object.values(dv).map(d => ({ date: d.date, amount: d.amount })).sort((a, b) => a.date - b.date);
    if (dl.length) {
      out.divs = dl;
      const now = Date.now() / 1000;
      const last12 = dl.filter(d => now - d.date < 400 * 86400).reduce((a, d) => a + d.amount, 0);
      out.yield12 = last12 / out.price * 100;
      out.lastDiv = dl[dl.length - 1];
      // 配息頻率（近3年平均每年次數）
      const r3 = dl.filter(d => now - d.date < 3.2 * 365 * 86400);
      out.freq = Math.round(r3.length / 3) || 1;
      // 近5年平均年配息
      const r5 = dl.filter(d => now - d.date < 5.2 * 365 * 86400);
      out.avgAnnualDiv = r5.reduce((a, d) => a + d.amount, 0) / 5;
    }
    if (out.cagr != null) out.totalReturn = out.cagr + (out.yield12 || 0);
    return out;
  }
  return null;
}

/* 台股實務：除息後約 30~45 天發放，取 38 天估算 */
const PAY_LAG_DAYS = 38;
function estPayDate(exTs) { return new Date((exTs + PAY_LAG_DAYS * 86400) * 1000); }

/* 依歷史頻率推估下次除息日 */
function estNextEx(s) {
  if (!s.lastDivDate || !s.freq) return null;
  const gap = 365 / s.freq;
  let d = new Date(s.lastDivDate * 1000);
  const now = new Date();
  let guard = 0;
  while (d <= now && guard++ < 12) d = new Date(d.getTime() + gap * 86400000);
  return d;
}

async function updateAllPrices(onProgress) {
  let ok = 0; const fail = [];
  for (let i = 0; i < D.stocks.length; i++) {
    const s = D.stocks[i];
    if (onProgress) onProgress(i + 1, D.stocks.length, s.code);
    const q = await fetchFull(s.code);
    if (q) {
      s.price = q.price; s.prevClose = q.prev;
      if (!s.name && q.name) s.name = q.name;
      s.market = q.market;
      if (q.cagr != null) { s.cagr = q.cagr; s.histYears = q.years; s.low10 = q.low; s.high10 = q.high; }
      if (q.yield12 != null) { s.yield = +q.yield12.toFixed(2); s.freq = q.freq; s.avgAnnualDiv = q.avgAnnualDiv; }
      if (q.totalReturn != null) s.totalReturn = q.totalReturn;
      if (q.lastDiv) { s.lastDivDate = q.lastDiv.date; s.lastDivAmount = q.lastDiv.amount; }
      if (q.divs) s.divHistory = q.divs.slice(-24);
      s.updated = new Date().toISOString();
      ok++;
    } else fail.push(s.code);
  }
  save();
  return { ok, fail };
}
