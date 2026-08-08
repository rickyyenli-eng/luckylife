/* AssetFlow · 主程式 */

/* ---------- 分頁 ---------- */
function go(id) {
  document.querySelectorAll('.tab').forEach(b => b.classList.toggle('on', b.dataset.p === id));
  document.querySelectorAll('.page').forEach(p => p.classList.toggle('on', p.id === 'p-' + id));
  window.scrollTo(0, 0);
  render();
}

/* ---------- 總覽 ---------- */
function renderOverview() {
  const el = document.getElementById('p-overview');
  const st = totalStock(), ot = totalOther(), re = totalRealtyEquity(), db = totalDebt();
  const nw = netWorth(), inc = annualIncome();
  const yrs = yearsToTarget();
  const tgt = D.profile.targetAsset || 2000;
  const pct = Math.min(100, liquidAsset() / tgt * 100);
  const incPct = Math.min(100, (inc / 12) / (D.profile.targetIncome || 5) * 100);
  const empty = !D.stocks.length && !D.assets.length && !D.realties.length;

  el.innerHTML = `
    <div class="hero">
      <div class="hl">總淨資產</div>
      <div class="hv">${fmt(nw)}<span class="hu">萬</span></div>
      <div class="grid">
        <div class="st"><div class="l">📊 股票</div><div class="v">${fmt(st)}</div></div>
        <div class="st"><div class="l">💰 其他資產</div><div class="v">${fmt(ot)}</div></div>
        <div class="st"><div class="l">🏠 不動產淨值</div><div class="v">${fmt(re)}</div></div>
        <div class="st"><div class="l">💳 負債</div><div class="v dn">${db ? '-' + fmt(db) : '0.0'}</div></div>
      </div>
    </div>

    ${empty ? `<div class="card"><div class="ct">👋 歡迎使用 AssetFlow</div>
      <div class="cs">三步驟開始管理你的資產</div>
      <div style="font-size:14px;line-height:2.1">
        1️⃣ 到「股票」加入你的台股持股（可自動抓價）<br>
        2️⃣ 到「其他資產」新增定存、儲蓄險、黃金…<br>
        3️⃣ 到「不動產」登記房產與貸款<br>
        4️⃣ 回來看你的退休進度 🎯
      </div>
      <button class="btn b1 full" style="margin-top:14px" onclick="go('stocks')">開始新增資產 →</button>
    </div>` : ''}

    <div class="card">
      <div class="ct">🎯 退休進度</div>
      <div class="cs">距離目標 ${fmt0(tgt)} 萬 · 月被動收入目標 ${fmt(D.profile.targetIncome, 1)} 萬</div>
      <div class="mini"><span>可投資資產</span><span><b>${fmt(liquidAsset())}</b> / ${fmt0(tgt)} 萬</span></div>
      <div class="bar"><div style="width:${pct}%;background:linear-gradient(90deg,var(--gold),var(--gold-d))"></div></div>
      <div style="font-size:11px;color:var(--soft);margin:3px 0 14px">${pct.toFixed(1)}%${yrs != null ? ` · 依目前配置與月投入，約 <b>${yrs.toFixed(1)} 年</b>達標（${Math.round((D.profile.age||30)+yrs)} 歲）` : ''}</div>
      <div class="mini"><span>月被動收入</span><span><b>${fmt(inc / 12, 2)}</b> / ${fmt(D.profile.targetIncome, 1)} 萬</span></div>
      <div class="bar"><div style="width:${incPct}%;background:linear-gradient(90deg,#6b9b7e,var(--green))"></div></div>
      <div style="font-size:11px;color:var(--soft);margin-top:3px">年被動收入 ${fmt(inc)} 萬 · 加權年報酬估 ${blendedReturn().toFixed(1)}%</div>
    </div>

    ${!empty ? `<div class="card">
      <div class="ct">🥧 資產分布</div><div class="cs">依市值占比</div>
      ${allocBars()}
    </div>` : ''}
  `;
}

function allocBars() {
  const rows = [];
  const st = totalStock(), re = totalRealtyEquity();
  if (st) rows.push(['📊 股票', st, '#1a5276']);
  D.assets.forEach(a => {
    const t = ASSET_TYPES[a.type] || ASSET_TYPES.other;
    rows.push([`${t.icon} ${a.name}`, a.amount || 0, t.color]);
  });
  if (re) rows.push(['🏠 不動產淨值', re, '#c0673f']);
  const tot = rows.reduce((a, r) => a + r[1], 0);
  if (!tot) return '<div class="empty">尚無資料</div>';
  return rows.sort((a, b) => b[1] - a[1]).map(([n, v, c]) => `
    <div style="margin-bottom:11px">
      <div class="mini"><span>${n}</span><span><b>${fmt(v)}</b> 萬 · ${(v / tot * 100).toFixed(1)}%</span></div>
      <div class="bar"><div style="width:${v / tot * 100}%;background:${c}"></div></div>
    </div>`).join('');
}

/* ---------- 股票 ---------- */
function renderStocks() {
  const el = document.getElementById('p-stocks');
  const tot = totalStock(), cost = D.stocks.reduce((a, s) => a + stockCost(s), 0);
  const pnl = tot - cost;
  el.innerHTML = `
    <div class="card">
      <div class="ct">📊 台股持股 <button class="btn b1 bs" onclick="stockForm()">+ 新增</button></div>
      <div class="cs">上市櫃個股與 ETF 皆可 · 單位「張」（1張=1000股）</div>
      ${D.stocks.length ? `
        <div class="grid" style="margin:0 0 14px">
          <div class="st"><div class="l">總市值</div><div class="v">${fmt(tot)} 萬</div></div>
          <div class="st"><div class="l">總成本</div><div class="v">${fmt(cost)} 萬</div></div>
          <div class="st"><div class="l">未實現損益</div><div class="v ${pnl >= 0 ? 'up' : 'dn'}">${pnl >= 0 ? '+' : ''}${fmt(pnl)} 萬</div></div>
          <div class="st"><div class="l">報酬率</div><div class="v ${pnl >= 0 ? 'up' : 'dn'}">${cost ? (pnl / cost * 100).toFixed(1) : '0.0'}%</div></div>
        </div>
        <button class="btn b2 full" id="btnUpd" onclick="doUpdate()">🔄 更新股價（Yahoo）</button>
        <div style="overflow-x:auto;margin-top:14px"><table>
          <tr><th>代號/名稱</th><th>張</th><th>成本</th><th>現價</th><th>市值(萬)</th><th>損益</th><th></th></tr>
          ${D.stocks.map(s => {
            const v = stockValue(s), c = stockCost(s), p = c ? (v - c) / c * 100 : 0;
            return `<tr>
              <td><b>${s.code}</b><div style="font-size:11px;color:var(--soft)">${s.name || ''}</div></td>
              <td>${fmt(s.lots, 3).replace(/\.?0+$/, '')}</td><td>${fmt(s.cost, 2)}</td><td>${fmt(s.price, 2)}</td>
              <td><b>${fmt(v)}</b></td>
              <td class="${p >= 0 ? 'up' : 'dn'}">${p >= 0 ? '+' : ''}${p.toFixed(1)}%</td>
              <td><button class="x" onclick="stockForm('${s.id}')">✎</button><button class="x" onclick="del('stocks','${s.id}')">×</button></td>
            </tr>`;
          }).join('')}
        </table></div>
        <div style="font-size:11px;color:var(--soft);margin-top:10px">💡 殖利率用於被動收入試算，可在編輯中自行填寫</div>
      ` : '<div class="empty">還沒有持股<br>點「+ 新增」加入第一檔</div>'}
    </div>`;
}

async function doUpdate() {
  if (!D.stocks.length) return;
  const b = document.getElementById('btnUpd');
  b.disabled = true;
  const r = await updateAllPrices((i, n, c) => { b.textContent = `更新中… ${i}/${n} (${c})`; });
  b.disabled = false; b.textContent = '🔄 更新股價（Yahoo）';
  toast(r.fail.length ? `更新 ${r.ok} 檔，失敗：${r.fail.join(',')}` : `已更新 ${r.ok} 檔股價 ✓`, r.fail.length > 0);
  render();
}

function stockForm(id) {
  const s = id ? D.stocks.find(x => x.id === id) : null;
  modal(`${s ? '編輯' : '新增'}持股`, `
    <div class="row">
      <div class="fg"><label class="fl">股票代號 *</label><input class="fi" id="f_code" value="${s?.code || ''}" placeholder="如 2330 / 0050"></div>
      <div class="fg"><label class="fl">名稱</label><input class="fi" id="f_name" value="${s?.name || ''}" placeholder="可留空自動抓"></div>
    </div>
    <div class="row">
      <div class="fg"><label class="fl">張數 *</label><input class="fi" id="f_lots" type="number" step="0.001" value="${s?.lots ?? ''}" placeholder="1.5 = 1張500股"></div>
      <div class="fg"><label class="fl">平均成本 *</label><input class="fi" id="f_cost" type="number" step="0.01" value="${s?.cost ?? ''}" placeholder="每股"></div>
    </div>
    <div class="row">
      <div class="fg"><label class="fl">現價</label><input class="fi" id="f_price" type="number" step="0.01" value="${s?.price ?? ''}" placeholder="留空自動抓"></div>
      <div class="fg"><label class="fl">年殖利率 %</label><input class="fi" id="f_yield" type="number" step="0.1" value="${s?.yield ?? ''}" placeholder="如 5"></div>
    </div>`, async () => {
    const code = document.getElementById('f_code').value.trim().toUpperCase();
    const lots = parseFloat(document.getElementById('f_lots').value);
    const cost = parseFloat(document.getElementById('f_cost').value);
    if (!code || !lots || isNaN(cost)) { toast('代號、張數、成本為必填', 1); return false; }
    const o = s || { id: uid('s') };
    o.code = code;
    o.name = document.getElementById('f_name').value.trim();
    o.lots = lots; o.cost = cost;
    o.price = parseFloat(document.getElementById('f_price').value) || o.price || 0;
    o.yield = parseFloat(document.getElementById('f_yield').value) || 0;
    if (!s) D.stocks.push(o);
    save(); render();
    if (!o.price || !o.name) {
      toast('抓取股價中…');
      const q = await fetchQuote(code);
      if (q) { o.price = o.price || q.price; o.name = o.name || q.name; save(); render(); toast(`${code} 已更新 ${q.price}`); }
      else toast('抓不到報價，請手動填現價', 1);
    }
    return true;
  });
}

/* ---------- 其他資產 ---------- */
function renderAssets() {
  const el = document.getElementById('p-assets');
  const tot = totalOther();
  el.innerHTML = `
    <div class="card">
      <div class="ct">💰 其他資產 <button class="btn b1 bs" onclick="assetForm()">+ 新增</button></div>
      <div class="cs">定存、儲蓄險、黃金、債券…自訂類別與預估年報酬率</div>
      ${D.assets.length ? `
        <div class="grid" style="margin:0 0 14px">
          <div class="st"><div class="l">合計</div><div class="v">${fmt(tot)} 萬</div></div>
          <div class="st"><div class="l">年產生收益</div><div class="v up">${fmt(D.assets.reduce((a, x) => a + (x.amount || 0) * (x.rate || 0) / 100, 0), 2)} 萬</div></div>
        </div>
        ${D.assets.map(a => {
          const t = ASSET_TYPES[a.type] || ASSET_TYPES.other;
          return `<div class="item">
            <span class="dot" style="background:${t.color}"></span>
            <div><div class="n">${t.icon} ${a.name}</div><div class="m">${t.name}${a.rate ? ` · 年報酬 ${a.rate}%` : ''}${a.note ? ` · ${a.note}` : ''}</div></div>
            <div class="r"><div class="v">${fmt(a.amount)} 萬</div></div>
            <button class="x" onclick="assetForm('${a.id}')">✎</button><button class="x" onclick="del('assets','${a.id}')">×</button>
          </div>`;
        }).join('')}
      ` : '<div class="empty">還沒有其他資產<br>點「+ 新增」加入定存、儲蓄險等</div>'}
    </div>`;
}

function assetForm(id) {
  const a = id ? D.assets.find(x => x.id === id) : null;
  modal(`${a ? '編輯' : '新增'}資產`, `
    <div class="fg"><label class="fl">類別</label><select class="fi" id="f_type" onchange="syncRate()">
      ${Object.entries(ASSET_TYPES).map(([k, v]) => `<option value="${k}" ${a?.type === k ? 'selected' : ''}>${v.icon} ${v.name}</option>`).join('')}
    </select></div>
    <div class="fg"><label class="fl">名稱 *</label><input class="fi" id="f_name" value="${a?.name || ''}" placeholder="如：台銀一年期定存"></div>
    <div class="row">
      <div class="fg"><label class="fl">金額（萬）*</label><input class="fi" id="f_amt" type="number" step="0.1" value="${a?.amount ?? ''}"></div>
      <div class="fg"><label class="fl">預估年報酬 %</label><input class="fi" id="f_rate" type="number" step="0.1" value="${a?.rate ?? ''}"></div>
    </div>
    <div class="fg"><label class="fl">備註</label><input class="fi" id="f_note" value="${a?.note || ''}" placeholder="如：2027/8 到期"></div>`, () => {
    const name = document.getElementById('f_name').value.trim();
    const amt = parseFloat(document.getElementById('f_amt').value);
    if (!name || isNaN(amt)) { toast('名稱與金額為必填', 1); return false; }
    const o = a || { id: uid('a') };
    o.type = document.getElementById('f_type').value;
    o.name = name; o.amount = amt;
    o.rate = parseFloat(document.getElementById('f_rate').value) || 0;
    o.note = document.getElementById('f_note').value.trim();
    if (!a) D.assets.push(o);
    save(); render(); return true;
  });
  if (!a) syncRate();
}
function syncRate() {
  const t = document.getElementById('f_type')?.value;
  const r = document.getElementById('f_rate');
  if (t && r && !r.value) r.value = ASSET_TYPES[t].defRate;
}

/* ---------- 不動產 ---------- */
function renderRealty() {
  const el = document.getElementById('p-realty');
  el.innerHTML = `
    <div class="card">
      <div class="ct">🏠 不動產與房貸 <button class="btn b1 bs" onclick="realtyForm()">+ 新增</button></div>
      <div class="cs">輸入購入價與貸款條件，自動算月付、剩餘本金、總利息</div>
      ${D.realties.length ? D.realties.map(r => {
        const rem = remainLoan(r), mv = r.marketValue || r.buyPrice || 0, eq = mv - rem;
        const now = new Date();
        const elapsed = (now.getFullYear() + now.getMonth() / 12) - (r.startYear || now.getFullYear());
        const inGrace = elapsed <= (r.graceYears || 0);
        const payNow = currentMonthlyPay(r);
        const payAfter = monthlyPay(r, false);
        const totalInt = payAfter * ((r.years - (r.graceYears || 0)) * 12) + monthlyPay(r, true) * (r.graceYears || 0) * 12 - r.loanAmount;
        return `<div style="border:1px solid var(--line);border-radius:12px;padding:15px;margin-bottom:11px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
            <b style="font-size:15px">${r.name}</b>
            ${inGrace ? '<span class="tag tg">寬限期中</span>' : ''}
            <button class="x" style="margin-left:auto" onclick="realtyForm('${r.id}')">✎</button>
            <button class="x" onclick="del('realties','${r.id}')">×</button>
          </div>
          <div class="grid" style="margin:0">
            <div class="st"><div class="l">目前月付</div><div class="v">${fmt(payNow, 2)} 萬</div></div>
            <div class="st"><div class="l">剩餘貸款</div><div class="v dn">${fmt(rem)} 萬</div></div>
            <div class="st"><div class="l">房產淨值</div><div class="v up">${fmt(eq)} 萬</div></div>
            <div class="st"><div class="l">預估總利息</div><div class="v">${fmt0(totalInt)} 萬</div></div>
          </div>
          <div style="font-size:11.5px;color:var(--soft);margin-top:10px;line-height:1.8">
            購入 ${fmt0(r.buyPrice)} 萬 · 貸款 ${fmt0(r.loanAmount)} 萬 · 利率 ${r.rate}% · ${r.years} 年${r.graceYears ? ` · 寬限 ${r.graceYears} 年` : ''}<br>
            ${inGrace ? `寬限期結束後月付將升至 <b>${fmt(payAfter, 2)} 萬</b>（+${fmt(payAfter - payNow, 2)} 萬）` : ''}
          </div>
        </div>`;
      }).join('') : '<div class="empty">還沒有不動產<br>點「+ 新增」登記你的房產</div>'}
    </div>`;
}

function realtyForm(id) {
  const r = id ? D.realties.find(x => x.id === id) : null;
  const y = new Date().getFullYear();
  modal(`${r ? '編輯' : '新增'}不動產`, `
    <div class="fg"><label class="fl">名稱 *</label><input class="fi" id="f_name" value="${r?.name || ''}" placeholder="如：台中自住宅"></div>
    <div class="row">
      <div class="fg"><label class="fl">購入價（萬）*</label><input class="fi" id="f_buy" type="number" value="${r?.buyPrice ?? ''}"></div>
      <div class="fg"><label class="fl">目前市價（萬）</label><input class="fi" id="f_mv" type="number" value="${r?.marketValue ?? ''}" placeholder="留空用購入價"></div>
    </div>
    <div class="sec">貸款資訊</div>
    <div class="row">
      <div class="fg"><label class="fl">貸款金額（萬）</label><input class="fi" id="f_loan" type="number" value="${r?.loanAmount ?? ''}"></div>
      <div class="fg"><label class="fl">年利率 %</label><input class="fi" id="f_rate" type="number" step="0.01" value="${r?.rate ?? 2.1}"></div>
    </div>
    <div class="row">
      <div class="fg"><label class="fl">貸款年限</label><input class="fi" id="f_years" type="number" value="${r?.years ?? 30}"></div>
      <div class="fg"><label class="fl">寬限期（年）</label><input class="fi" id="f_grace" type="number" value="${r?.graceYears ?? 0}"></div>
    </div>
    <div class="row">
      <div class="fg"><label class="fl">開始年份</label><input class="fi" id="f_start" type="number" value="${r?.startYear ?? y}"></div>
      <div class="fg"><label class="fl">實際月付（萬）</label><input class="fi" id="f_pay" type="number" step="0.01" value="${r?.monthlyPay ?? ''}" placeholder="留空自動算"></div>
    </div>`, () => {
    const name = document.getElementById('f_name').value.trim();
    const buy = parseFloat(document.getElementById('f_buy').value);
    if (!name || isNaN(buy)) { toast('名稱與購入價為必填', 1); return false; }
    const o = r || { id: uid('r') };
    o.name = name; o.buyPrice = buy;
    o.marketValue = parseFloat(document.getElementById('f_mv').value) || 0;
    o.loanAmount = parseFloat(document.getElementById('f_loan').value) || 0;
    o.rate = parseFloat(document.getElementById('f_rate').value) || 0;
    o.years = parseInt(document.getElementById('f_years').value) || 30;
    o.graceYears = parseInt(document.getElementById('f_grace').value) || 0;
    o.startYear = parseInt(document.getElementById('f_start').value) || y;
    o.monthlyPay = parseFloat(document.getElementById('f_pay').value) || 0;
    if (!r) D.realties.push(o);
    save(); render(); return true;
  });
}

/* ---------- 設定 ---------- */
function renderSettings() {
  const el = document.getElementById('p-settings');
  const p = D.profile;
  el.innerHTML = `
    <div class="card">
      <div class="ct">🎯 我的目標</div><div class="cs">用於退休試算</div>
      <div class="row">
        <div class="fg"><label class="fl">目前年齡</label><input class="fi" type="number" value="${p.age}" onchange="setP('age',this.value)"></div>
        <div class="fg"><label class="fl">目標資產（萬）</label><input class="fi" type="number" step="100" value="${p.targetAsset}" onchange="setP('targetAsset',this.value)"></div>
      </div>
      <div class="row">
        <div class="fg"><label class="fl">目標月被動收入（萬）</label><input class="fi" type="number" step="0.5" value="${p.targetIncome}" onchange="setP('targetIncome',this.value)"></div>
        <div class="fg"><label class="fl">每月可投入（萬）</label><input class="fi" type="number" step="0.5" value="${p.monthlyInvest}" onchange="setP('monthlyInvest',this.value)"></div>
      </div>
    </div>
    <div class="card">
      <div class="ct">💳 負債 <button class="btn b1 bs" onclick="debtForm()">+ 新增</button></div>
      <div class="cs">信貸、車貸、借款等（房貸請在「不動產」登記）</div>
      ${D.liabilities.length ? D.liabilities.map(l => `<div class="item">
        <span class="dot" style="background:var(--red)"></span>
        <div><div class="n">${l.name}</div>${l.note ? `<div class="m">${l.note}</div>` : ''}</div>
        <div class="r"><div class="v dn">-${fmt(l.amount)} 萬</div></div>
        <button class="x" onclick="del('liabilities','${l.id}')">×</button></div>`).join('') : '<div class="empty">目前無負債紀錄 👍</div>'}
    </div>
    <div class="card">
      <div class="ct">📦 資料備份</div>
      <div class="cs">資料只存在你的瀏覽器。換裝置或清快取前，請先匯出</div>
      <div class="row">
        <button class="btn b1" style="flex:1" onclick="expJson()">⬇ 匯出 JSON</button>
        <button class="btn b2" style="flex:1" onclick="document.getElementById('impFile').click()">⬆ 匯入 JSON</button>
      </div>
      <input type="file" id="impFile" accept=".json" style="display:none" onchange="impJson(this)">
      <button class="btn b3 full" style="margin-top:8px;color:var(--red)" onclick="resetAll()">🗑 清除所有資料</button>
    </div>`;
}
function setP(k, v) { D.profile[k] = parseFloat(v) || 0; save(); render(); }
function debtForm() {
  modal('新增負債', `
    <div class="fg"><label class="fl">名稱 *</label><input class="fi" id="f_name" placeholder="如：信用貸款"></div>
    <div class="fg"><label class="fl">餘額（萬）*</label><input class="fi" id="f_amt" type="number" step="0.1"></div>
    <div class="fg"><label class="fl">備註</label><input class="fi" id="f_note" placeholder="如：2027 還清"></div>`, () => {
    const n = document.getElementById('f_name').value.trim(), a = parseFloat(document.getElementById('f_amt').value);
    if (!n || isNaN(a)) { toast('請填名稱與金額', 1); return false; }
    D.liabilities.push({ id: uid('l'), name: n, amount: a, note: document.getElementById('f_note').value.trim() });
    save(); render(); return true;
  });
}

/* ---------- 共用 ---------- */
function del(k, id) {
  if (!confirm('確定刪除？')) return;
  D[k] = D[k].filter(x => x.id !== id); save(); render(); toast('已刪除');
}
function modal(title, body, onOk) {
  const m = document.getElementById('modal');
  m.innerHTML = `<div class="mbox">
    <div class="ct" style="margin-bottom:16px">${title}</div>${body}
    <div class="row" style="margin-top:8px">
      <button class="btn b2" style="flex:1" onclick="closeModal()">取消</button>
      <button class="btn b1" style="flex:1" id="mOk">儲存</button>
    </div></div>`;
  m.classList.add('on');
  document.getElementById('mOk').onclick = async () => { if (await onOk() !== false) closeModal(); };
  m.onclick = e => { if (e.target === m) closeModal(); };
}
function closeModal() { document.getElementById('modal').classList.remove('on'); }

function expJson() {
  const blob = new Blob([JSON.stringify({ app: 'assetflow', at: new Date().toISOString(), data: D }, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `assetflow-${new Date().toISOString().slice(0, 10)}.json`;
  a.click(); URL.revokeObjectURL(a.href);
  toast('已匯出備份');
}
function impJson(inp) {
  const f = inp.files[0]; if (!f) return;
  const rd = new FileReader();
  rd.onload = e => {
    try {
      const j = JSON.parse(e.target.result);
      const d = j.app === 'assetflow' ? j.data : j;
      if (!d.stocks && !d.assets) { toast('格式不符', 1); return; }
      if (!confirm('將覆蓋目前資料，確定？')) return;
      D = { ...structuredClone(DEF), ...d }; save(); render(); toast('匯入成功 ✓');
    } catch (er) { toast('讀取失敗', 1); }
  };
  rd.readAsText(f); inp.value = '';
}
function resetAll() {
  if (!confirm('清除所有資料且無法復原，建議先匯出備份。確定？')) return;
  localStorage.removeItem(SK); D = structuredClone(DEF); render(); toast('已清除');
}

function render() {
  renderOverview(); renderStocks(); renderAssets(); renderRealty(); renderSettings();
}
document.addEventListener('DOMContentLoaded', () => {
  load();
  document.querySelectorAll('.tab').forEach(b => b.onclick = () => go(b.dataset.p));
  render();
});
