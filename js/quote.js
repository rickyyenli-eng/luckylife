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
      const last12 = dl.filter(d => now - d.date < 365 * 86400).reduce((a, d) => a + d.amount, 0);
      out.annual12 = last12;                    // 近12個月實際配息合計（元/股）
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
      if (q.yield12 != null) { s.yield = +q.yield12.toFixed(2); s.freq = q.freq; s.annual12 = q.annual12; s.avgAnnualDiv = q.avgAnnualDiv; }
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

/* ===== 非台股報價來源 ===== */

// 加密貨幣（CoinGecko，免費免金鑰）
async function fetchCrypto(symbols) {
  const ids = symbols.map(s => CRYPTO_IDS[s.toUpperCase()] || s.toLowerCase()).filter(Boolean);
  if (!ids.length) return {};
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(',')}&vs_currencies=twd,usd&include_24hr_change=true`;
  let j = null;
  try { const r = await fetch(url, { signal: AbortSignal.timeout(10000) }); if (r.ok) j = await r.json(); } catch (e) {}
  if (!j) j = await tryFetch(url);          // 失敗改走 proxy
  if (!j) return {};
  const out = {};
  symbols.forEach(s => {
    const id = CRYPTO_IDS[s.toUpperCase()] || s.toLowerCase();
    if (j[id]) out[s.toUpperCase()] = { twd: j[id].twd, usd: j[id].usd, chg: j[id].twd_24h_change };
  });
  return out;
}

// 黃金（Yahoo 黃金期貨 GC=F，美元/盎司 → 台幣/公克）
async function fetchGold() {
  const j = await tryFetch('https://query1.finance.yahoo.com/v8/finance/chart/GC=F');
  const m = j?.chart?.result?.[0]?.meta;
  if (!m?.regularMarketPrice) return null;
  const fx = await fetchFX();
  const perGramTWD = m.regularMarketPrice * fx / 31.1035;
  return { usdPerOz: m.regularMarketPrice, twdPerGram: perGramTWD, fx };
}

// 匯率 USD→TWD
async function fetchFX() {
  const j = await tryFetch('https://api.exchangerate-api.com/v4/latest/USD');
  const v = j?.rates?.TWD;
  if (v) { D.fxUSD = v; }
  return v || D.fxUSD || 32;
}

// 美股 / 海外 ETF / 債券ETF（Yahoo，自動判斷台股或美股）
async function fetchTicker(code) {
  const sufs = /^\d/.test(code) ? ['.TW', '.TWO'] : [''];   // 數字開頭視為台股
  for (const suf of sufs) {
    const j = await tryFetch(`https://query1.finance.yahoo.com/v8/finance/chart/${code}${suf}`);
    const m = j?.chart?.result?.[0]?.meta;
    if (m?.regularMarketPrice) return {
      price: m.regularMarketPrice, name: (m.shortName || '').trim(),
      currency: m.currency || (suf ? 'TWD' : 'USD'),
    };
  }
  return null;
}

/* 更新所有可報價的其他資產 */
async function updateAssetPrices(onProgress) {
  let ok = 0; const fail = [];
  const cryptos = D.assets.filter(a => ASSET_TYPES[a.type]?.quote === 'crypto' && a.symbol && a.qty);
  const golds   = D.assets.filter(a => ASSET_TYPES[a.type]?.quote === 'gold' && a.qty);
  const tickers = D.assets.filter(a => ASSET_TYPES[a.type]?.quote === 'ticker' && a.symbol && a.qty);
  const total = (cryptos.length ? 1 : 0) + (golds.length ? 1 : 0) + tickers.length;
  let step = 0;

  if (cryptos.length) {
    if (onProgress) onProgress(++step, total, '加密貨幣');
    const q = await fetchCrypto(cryptos.map(a => a.symbol));
    cryptos.forEach(a => {
      const r = q[a.symbol.toUpperCase()];
      if (r) { a.price = r.twd; a.currency = 'TWD'; a.chg24 = r.chg; a.updated = new Date().toISOString(); ok++; }
      else fail.push(a.symbol);
    });
  }
  if (golds.length) {
    if (onProgress) onProgress(++step, total, '黃金');
    const g = await fetchGold();
    if (g) golds.forEach(a => { a.price = g.twdPerGram; a.currency = 'TWD'; a.updated = new Date().toISOString(); ok++; });
    else fail.push('黃金');
  }
  for (const a of tickers) {
    if (onProgress) onProgress(++step, total, a.symbol);
    const t = await fetchTicker(a.symbol);
    if (t) {
      a.price = t.price; a.currency = t.currency === 'TWD' ? 'TWD' : 'USD';
      if (!a.name || a.name === ASSET_TYPES[a.type].name) {
        const n = (t.name || '').trim();
        a.name = (!n || n.length > 18) ? a.symbol : n;   // 名稱過長（投信全名）就用代號
      }
      a.updated = new Date().toISOString(); ok++;
    } else fail.push(a.symbol);
  }
  if (D.assets.some(a => a.currency === 'USD')) await fetchFX();
  save();
  return { ok, fail };
}
