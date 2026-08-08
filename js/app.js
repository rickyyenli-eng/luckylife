/* AssetFlow · 主程式 */

/* ---------- 分頁 ---------- */
function go(id) {
  document.querySelectorAll('.tab').forEach(b => b.classList.toggle('on', b.dataset.p === id));
  document.querySelectorAll('.page').forEach(p => p.classList.toggle('on', p.id === 'p-' + id));
  window.scrollTo(0, 0);
  render();
}

/* ---------- 總覽 Dashboard ---------- */
function renderOverview() {
  const el = document.getElementById('p-overview');
  const st=totalStock(), ot=totalOther(), re_=totalRealtyPaid(), db=totalDebt();
  const nw=netWorth(), inc=annualIncome(), liq=liquidAsset();
  const yrs=yearsToTarget(), tgt=D.profile.targetAsset||2000;
  const pct=Math.min(100,liq/tgt*100), incPct=Math.min(100,(inc/12)/(D.profile.targetIncome||5)*100);
  const p=D.profile;
  const cost=D.stocks.reduce((a,s)=>a+stockCost(s),0), pnl=st-cost;
  const surplus=(p.monthlyIncome||0)-(p.monthlyExpense||0);
  const empty=!D.stocks.length&&!D.assets.length&&!D.realties.length;

  el.innerHTML = `
    ${empty ? `<div class="card" style="background:linear-gradient(135deg,#fdf8f0,#f7ecd9);border:none">
      <div style="font-size:34px;text-align:center;margin-bottom:6px">👋</div>
      <div style="font-size:18px;font-weight:700;text-align:center;margin-bottom:4px">開始管理你的資產</div>
      <div style="font-size:13px;color:var(--muted);text-align:center;margin-bottom:18px">兩種方式，都只要 2 分鐘</div>
      <div class="row">
        <button class="btn b1" style="flex:1" onclick="startOnboard()">🧭 引導設定</button>
        <button class="btn b2" style="flex:1" onclick="document.getElementById('impFileTop').click()">📥 匯入 JSON</button>
      </div>
      <input type="file" id="impFileTop" accept=".json" style="display:none" onchange="impJson(this)">
    </div>` : ''}
    <div class="hero">
      <div class="hl">總淨資產</div>
      <div class="hv">${fmt(nw)}<span class="hu">萬</span></div>
      <div style="font-size:12px;color:var(--soft);margin-top:4px">
        ${p.age?`${p.age} 歲`:''}${yrs!=null?` · 預估 ${Math.round(p.age+yrs)} 歲達標`:''}${surplus?` · 月結餘 ${fmt(surplus,1)} 萬`:''}
      </div>
    </div>

    <div class="dash">
      <div class="dcard"><div class="dl">📊 股票市值</div><div class="dv">${fmt(st)}</div>
        <div class="dm ${pnl>=0?'up':'dn'}">${pnl>=0?'▲':'▼'} ${fmt(Math.abs(pnl))} 萬 (${cost?(pnl/cost*100).toFixed(1):0}%)</div></div>
      <div class="dcard"><div class="dl">💰 其他資產</div><div class="dv">${fmt(ot)}</div>
        <div class="dm">${D.assets.length} 個項目</div></div>
      <div class="dcard"><div class="dl">🏠 房產已投入</div><div class="dv">${fmt(re_)}</div>
        <div class="dm">${D.realties.length?`總價 ${fmt0(totalRealtyPrice())} 萬${totalMortgage()?` · 貸款餘額 ${fmt0(totalMortgage())} 萬`:' · 未起貸'}`:'尚未登記'}</div></div>
      <div class="dcard"><div class="dl">🧧 年被動收入</div><div class="dv up">${fmt(inc)}</div>
        <div class="dm">月均 ${fmt(inc/12,2)} 萬</div></div>
    </div>

    <div class="card">
      <div class="ct">🎯 退休進度</div>
      <div class="cs">目標 ${fmt0(tgt)} 萬 · 月被動收入 ${fmt(p.targetIncome,1)} 萬</div>
      <div class="mini"><span>可投資資產</span><span><b>${fmt(liq)}</b> / ${fmt0(tgt)} 萬</span></div>
      <div class="bar"><div style="width:${pct}%;background:linear-gradient(90deg,var(--gold),var(--gold-d))"></div></div>
      <div style="font-size:11px;color:var(--soft);margin:3px 0 14px">${pct.toFixed(1)}%${yrs!=null?` · 約 <b>${yrs.toFixed(1)} 年</b>達標`:' · 請到設定填入每月可投入金額'}</div>
      <div class="mini"><span>月被動收入</span><span><b>${fmt(inc/12,2)}</b> / ${fmt(p.targetIncome,1)} 萬</span></div>
      <div class="bar"><div style="width:${incPct}%;background:linear-gradient(90deg,#6b9b7e,var(--green))"></div></div>
      <div style="font-size:11px;color:var(--soft);margin-top:3px">加權年報酬估 ${blendedReturn().toFixed(1)}%${db?` · 負債 ${fmt(db)} 萬`:''}</div>
    </div>

    <div class="card">
      <div class="ct">🥧 資產分布</div><div class="cs">依市值占比</div>
      <div class="donut">${donut()}<div class="legend">${legend()}</div></div>
    </div>

    <div class="card">
      <div class="ct">💾 資料保存方式</div>
      <div class="cs">目前模式：<b id="modeLabel">${getMode()==='session'?'本次瀏覽（關閉即清除）':'一直保留在本瀏覽器'}</b></div>
      <div class="row" style="margin-bottom:10px">
        <button class="btn ${getMode()==='local'?'b1':'b2'}" style="flex:1" onclick="switchMode('local')">🔒 一直保留</button>
        <button class="btn ${getMode()==='session'?'b1':'b2'}" style="flex:1" onclick="switchMode('session')">🕶️ 僅本次</button>
      </div>
      <div class="row">
        <button class="btn b2" style="flex:1" onclick="expJson()">⬇ 匯出 JSON</button>
        <button class="btn b2" style="flex:1" onclick="document.getElementById('impFileOv').click()">⬆ 匯入 JSON</button>
      </div>
      <input type="file" id="impFileOv" accept=".json" style="display:none" onchange="impJson(this)">
      <div class="note" style="margin-top:12px">
        <b>🔐 關於你的資料</b><br>
        所有資料只存在你自己的裝置，不會上傳任何伺服器。<br><br>
        <b>「一直保留」</b>：資料存在瀏覽器，下次打開自動載入。方便，但若是公用電腦請留意。<br>
        <b>「僅本次」</b>：關閉分頁即清除。<b>有資安疑慮者建議開無痕視窗使用</b>，離開前記得「⬇ 匯出 JSON」自己收好，下次再匯入即可繼續。
      </div>
    </div>

    ${p.plans&&p.plans.length&&!p.plans.includes('none')?`<div class="card">
      <div class="ct">📅 你的未來計畫</div><div class="cs">記得為這些目標預留資金</div>
      <div class="ob-chips">${p.plans.map(k=>`<span class="chip on" style="cursor:default">${PLAN_LABELS[k]||k}</span>`).join('')}</div>
    </div>`:''}

    ${tarotCard()}
    ${footer()}
  `;
}
function tarotCard() {
  return `<a href="https://rickyyenli-eng.github.io/moonlight-tarot/index.html" target="_blank" rel="noopener"
    style="display:block;text-decoration:none;background:linear-gradient(140deg,#2d2440,#4a3564);border-radius:var(--r);
    padding:20px;margin-bottom:14px;box-shadow:var(--sh);position:relative;overflow:hidden">
    <div style="position:absolute;right:-6px;top:-10px;font-size:74px;opacity:.13">🌙</div>
    <div style="font-size:11.5px;color:#b8a5d8;font-weight:600;letter-spacing:.5px">看盤看累了嗎？</div>
    <div style="font-size:18px;color:#f0e8ff;font-weight:700;margin:4px 0 6px">Moonlight Tarot · 抽一張每日運勢</div>
    <div style="font-size:12.5px;color:#c8bade;line-height:1.7;position:relative">數字看久了會焦慮，讓自己休息三分鐘。<br>78 張韋特塔羅，靜下心來問問內心的聲音 →</div>
  </a>`;
}

function footer() {
  const y = new Date().getFullYear();
  return `<div style="text-align:center;padding:26px 10px 40px;font-size:11.5px;color:var(--soft);line-height:2.1;border-top:1px solid var(--line);margin-top:8px">
    <div style="font-weight:700;color:var(--muted);font-size:13px;margin-bottom:4px">LuckyLife 個人資產管理</div>
    © ${y} LuckyLife · Released under the MIT License<br>
    股價與配息資料來源：Yahoo Finance（延遲報價，僅供參考）<br>
    本工具所有試算僅供個人財務規劃參考，<b>不構成投資建議</b>；投資有風險，請自行評估並以券商對帳單為準。<br>
    <span style="opacity:.8">資料儲存於使用者本機瀏覽器，本站不蒐集、不上傳任何個人資料。</span><br>
    <a href="https://rickyyenli-eng.github.io/moonlight-tarot/index.html" target="_blank" rel="noopener" style="color:var(--gold-d)">🌙 Moonlight Tarot</a>
  </div>`;
}

const PLAN_LABELS={buy:'🏠 買房',car:'🚗 買車',marry:'💍 結婚',baby:'👶 生小孩',study:'🎓 進修',travel:'✈️ 旅遊基金',parent:'👵 奉養父母'};

function allocRows(){
  const rows=[]; const st=totalStock(), re_=totalRealtyPaid();
  if(st) rows.push(['📊 股票',st,'#1a5276']);
  D.assets.forEach(a=>{const t=ASSET_TYPES[a.type]||ASSET_TYPES.other; rows.push([`${t.icon} ${a.name}`,a.amount||0,t.color]);});
  if(re_) rows.push(['🏠 房產已投入',re_,'#c0673f']);
  return rows.sort((a,b)=>b[1]-a[1]);
}
function donut(){
  const rows=allocRows(), tot=rows.reduce((a,r)=>a+r[1],0);
  if(!tot) return '';
  const R=52,C=2*Math.PI*R; let off=0;
  const segs=rows.map(([n,v,c])=>{const len=v/tot*C; const s=`<circle cx="60" cy="60" r="${R}" fill="none" stroke="${c}" stroke-width="15" stroke-dasharray="${len} ${C-len}" stroke-dashoffset="${-off}" transform="rotate(-90 60 60)"/>`; off+=len; return s;}).join('');
  return `<svg viewBox="0 0 120 120" style="width:120px;height:120px">${segs}
    <text x="60" y="56" text-anchor="middle" font-size="10" fill="#a89886">總資產</text>
    <text x="60" y="72" text-anchor="middle" font-size="17" font-weight="800" fill="#3d2818">${fmt0(tot)}</text></svg>`;
}
function legend(){
  const rows=allocRows(), tot=rows.reduce((a,r)=>a+r[1],0);
  if(!tot) return '<div class="empty">尚無資料</div>';
  return rows.map(([n,v,c])=>`<div class="lg"><span class="sw" style="background:${c}"></span>${n}<span class="lv">${(v/tot*100).toFixed(1)}%</span></div>`).join('');
}

/* ---------- 股票 ---------- */
function renderStocks() {
  const el = document.getElementById('p-stocks');
  const tot = totalStock(), cost = D.stocks.reduce((a, s) => a + stockCost(s), 0);
  const pnl = tot - cost;
  el.innerHTML = `
    <div class="card">
      <div class="ct">📊 台股持股 <button class="btn b1 bs" onclick="stockForm()">+ 新增</button></div>
      <div class="cs">上市櫃個股與 ETF · 單位「張」（1張=1000股）</div>
      ${D.stocks.length ? `
        <div class="grid" style="margin:0 0 14px">
          <div class="st"><div class="l">總市值</div><div class="v">${fmt(tot)} 萬</div></div>
          <div class="st"><div class="l">總成本</div><div class="v">${fmt(cost)} 萬</div></div>
          <div class="st"><div class="l">未實現損益</div><div class="v ${pnl>=0?'up':'dn'}">${pnl>=0?'+':''}${fmt(pnl)} 萬</div></div>
          <div class="st"><div class="l">報酬率</div><div class="v ${pnl>=0?'up':'dn'}">${cost?(pnl/cost*100).toFixed(1):'0.0'}%</div></div>
        </div>
        <button class="btn b2 full" id="btnUpd" onclick="doUpdate()">🔄 更新股價 · 股利 · 歷史報酬</button>
        <div style="overflow-x:auto;margin-top:14px"><table>
          <tr><th>代號</th><th>張</th><th>成本</th><th>現價</th><th>市值</th><th>損益</th><th>殖利率</th><th></th></tr>
          ${D.stocks.map(s => {
            const v = stockValue(s), c = stockCost(s), p = c ? (v-c)/c*100 : 0;
            return `<tr>
              <td><b>${s.code}</b><div style="font-size:10.5px;color:var(--soft)">${(s.name||'').slice(0,10)}</div></td>
              <td>${fmt(s.lots,3).replace(/\.?0+$/,'')}</td><td>${fmt(s.cost,2)}</td><td>${fmt(s.price,2)}</td>
              <td><b>${fmt(v)}</b></td>
              <td class="${p>=0?'up':'dn'}">${p>=0?'+':''}${p.toFixed(1)}%</td>
              <td>${yieldEst(s)?yieldEst(s).toFixed(1)+'%':'—'}</td>
              <td style="white-space:nowrap"><button class="x" onclick="stockForm('${s.id}')">✎</button><button class="x" onclick="del('stocks','${s.id}')">×</button></td>
            </tr>`;
          }).join('')}
        </table></div>
      ` : '<div class="empty">還沒有持股<br>點「+ 新增」加入第一檔</div>'}
    </div>

    ${growthCard()}

    ${projectionCard()}
  `;
}


/* 長期成長分析卡 */
function growthCard() {
  const has = D.stocks.filter(s => s.cagr != null);
  if (!D.stocks.length) return `<div class="card">
    <div class="ct">📈 長期成長分析</div>
    <div class="cs">看每檔標的近 10 年的價格年化成長與含息總報酬</div>
    <div class="empty">加入持股後，按「更新股價」即可自動分析</div></div>`;
  if (!has.length) return `<div class="card" style="background:linear-gradient(135deg,#fef6e9,#fcebcb);border:none">
    <div class="ct">📈 長期成長分析 · 尚未分析</div>
    <div style="font-size:13px;color:#6b4d2e;line-height:1.85">按上方「🔄 更新股價 · 股利 · 歷史報酬」，系統會自動抓取每檔近 10 年的價格年化成長、殖利率、含息總報酬與完整配息歷史，並解鎖「配息行事曆」與「未來資產推估」。</div></div>`;
  const rows = has.map(s => `<tr>
      <td><b>${s.code}</b><div style="font-size:10.5px;color:var(--soft)">${(s.name||'').slice(0,8)}</div></td>
      <td>${s.histYears ? s.histYears.toFixed(1)+'年' : '—'}</td>
      <td class="${s.cagr>=0?'up':'dn'}">${s.cagr>=0?'+':''}${s.cagr.toFixed(1)}%</td>
      <td>${yieldEst(s)?yieldEst(s).toFixed(1)+'%':'—'}</td>
      <td><b class="${(s.totalReturn||0)>=0?'up':'dn'}">${(s.totalReturn||0).toFixed(1)}%</b></td>
      <td style="font-size:11px;color:var(--soft)">${s.low10 ? fmt(s.low10,1)+'~'+fmt(s.high10,1) : '—'}</td>
    </tr>`).join('');
  return `<div class="card">
    <div class="ct">📈 長期成長分析</div>
    <div class="cs">依 Yahoo Finance 月線計算 · 含息總報酬 ＝ 價格年化成長 ＋ 現金殖利率</div>
    <div style="overflow-x:auto"><table>
      <tr><th>標的</th><th>期間</th><th>價格年化</th><th>殖利率</th><th>含息總報酬</th><th>價格區間</th></tr>
      ${rows}
    </table></div>
    <div class="note" style="margin-top:12px">💡 歷史報酬不代表未來績效。<b>市值型</b>報酬多來自價格成長、<b>高股息型</b>多來自現金配息，兩者相加才是真實總報酬——只看股價漲跌會低估高息 ETF。</div>
  </div>`;
}

/* 預期年報酬：手動 > 保守推估（歷史七折、市值型上限7%、高息上限5.5%） */
function expReturn(s) {
  if (s.expReturn) return s.expReturn;
  const isDiv = yieldEst(s) >= 4;           // 殖利率≥4% 視為高股息型
  const cap = isDiv ? 5.5 : 7;
  if (s.totalReturn == null) return cap;
  return Math.max(2, Math.min(cap, s.totalReturn * 0.7));
}

/* 未來資產推估 · 逐檔複利 */
function projectionCard() {
  const liq = liquidAsset();
  if (!liq) return `<div class="card"><div class="ct">🔮 未來資產推估</div>
    <div class="empty">加入資產後即可看到 5/10/15/20 年後的資產推估與情境區間</div></div>`;
  const m = D.profile.monthlyInvest || 0;
  const hasHist = D.stocks.some(s => s.totalReturn != null);

  // 每個標的的年報酬（股票用實際歷史含息總報酬，上限15%；其他資產用自填利率）
  const items = [];
  D.stocks.forEach(s => items.push({ name: s.code, v: stockValue(s),
    r: expReturn(s), hist: s.totalReturn, kind: 'stock' }));
  D.assets.forEach(a => items.push({ name: a.name, v: a.amount || 0, r: a.rate || 0, kind: 'asset' }));
  const totV = items.reduce((a, x) => a + x.v, 0) || 1;
  // 新資金依「股票現有配置比例」投入（其他資產不再增額）
  const stockV = items.filter(x => x.kind === 'stock').reduce((a, x) => a + x.v, 0);

  function project(years, adj) {
    return items.map(x => {
      let v = x.v;
      const rm = Math.max(-0.5, (x.r + adj)) / 100 / 12;
      // 月投入分配：股票依各自佔股票池比例；無股票則平均進所有資產
      const share = x.kind === 'stock'
        ? (stockV ? x.v / stockV : 0)
        : (stockV ? 0 : x.v / totV);
      for (let i = 0; i < years * 12; i++) v = v * (1 + rm) + m * share;
      return { name: x.name, v, r: x.r };
    });
  }

  const rows = [5, 10, 15, 20].map(y => {
    const base = project(y, 0), lo = project(y, -3), hi = project(y, 3);
    const sum = a => a.reduce((s, x) => s + x.v, 0);
    return { y, age: (D.profile.age || 30) + y, a: sum(base), lo: sum(lo), hi: sum(hi), detail: base };
  });
  const max = rows[rows.length - 1].hi;
  const y20 = rows[rows.length - 1];
  // 實效年化（回推）
  const eff = (Math.pow(rows[0].a / liq, 1 / 5) - 1) * 100;

  return `<div class="card">
    <div class="ct">🔮 未來資產推估</div>
    <div class="cs">逐檔複利：每個標的用<b>自己的年化報酬</b>各自成長，不是全部套同一個數字</div>
    <div style="overflow-x:auto;margin-bottom:16px"><table>
      <tr><th>標的</th><th>目前(萬)</th><th>歷史年化</th><th>推估採用</th><th>20年後(萬)</th></tr>
      ${y20.detail.filter(d => d.v > 0).sort((a, b) => b.v - a.v).map(d => {
        const it = items.find(i => i.name === d.name);
        return `<tr>
        <td><b>${d.name}</b></td>
        <td>${fmt0(it?.v || 0)}</td>
        <td style="color:var(--soft)">${it?.hist != null ? it.hist.toFixed(1)+'%' : '—'}</td>
        <td><b>${d.r.toFixed(1)}%</b></td>
        <td><b>${fmt0(d.v)}</b></td></tr>`; }).join('')}
    </table></div>
    ${rows.map(x => `
      <div style="margin-bottom:13px">
        <div class="mini"><span><b>${x.y} 年後</b> · ${x.age} 歲</span><span><b style="font-size:15px">${fmt0(x.a)}</b> 萬</span></div>
        <div style="position:relative;height:22px;background:var(--bg);border-radius:5px;overflow:hidden">
          <div style="position:absolute;left:${x.lo / max * 100}%;width:${(x.hi - x.lo) / max * 100}%;height:100%;background:rgba(184,133,74,.18)"></div>
          <div style="position:absolute;left:0;width:${x.a / max * 100}%;height:100%;background:linear-gradient(90deg,var(--gold),var(--gold-d));border-radius:5px"></div>
        </div>
        <div style="font-size:10.5px;color:var(--soft);margin-top:2px">保守 ${fmt0(x.lo)} ~ 樂觀 ${fmt0(x.hi)} 萬（各檔報酬 ±3%）</div>
      </div>`).join('')}
    <div class="note">📌 每月投入 ${fmt(m, 1)} 萬依<b>目前股票配置比例</b>分配，整體實效年化約 ${eff.toFixed(1)}%。<br>
      ⚠️ <b>為什麼推估報酬低於歷史？</b> 過去十年台股處於少見的大多頭，若直接把 20% 外推二十年會得到極不合理的天文數字。系統預設採<b>保守值</b>（市值型 7%、高股息 5.5%，且不超過歷史的七成），這是長期規劃該用的假設。<br>
      💡 每檔可到「股票 → 編輯」自訂「預期年報酬」，改成你自己的判斷。</div>
  </div>`;
}

async function doUpdate() {
  if (!D.stocks.length) return;
  const b = document.getElementById('btnUpd');
  b.disabled = true;
  const r = await updateAllPrices((i, n, c) => { b.textContent = `更新中… ${i}/${n} (${c})`; });
  b.disabled = false; b.textContent = '🔄 更新股價 · 股利 · 歷史報酬';
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
      <div class="fg"><label class="fl">年殖利率 %</label><input class="fi" id="f_yield" type="number" step="0.1" value="${s?.yield ?? ''}" placeholder="更新後自動"></div>
    </div>
    <div class="row">
      <div class="fg"><label class="fl">下期配息（元/股）</label><input class="fi" id="f_divov" type="number" step="0.01" value="${s?.divOverride ?? ''}" placeholder="${s?.lastDivAmount ? '預設 '+s.lastDivAmount : '投信公告後可填'}"></div>
      <div class="fg"><label class="fl">預期年報酬 %</label><input class="fi" id="f_exp" type="number" step="0.1" value="${s?.expReturn ?? ''}" placeholder="${s ? '預設 '+expReturn(s).toFixed(1) : '保守推估'}"></div>
    </div>
    <div style="font-size:11px;color:var(--soft);margin-bottom:6px">💡 預期年報酬用於「未來資產推估」，留空則用系統保守值（歷史七折、市值型上限7%、高息上限5.5%）</div>`, async () => {
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
    o.divOverride = parseFloat(document.getElementById('f_divov').value) || 0;
    o.expReturn = parseFloat(document.getElementById('f_exp').value) || 0;
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
            <div><div class="n">${t.icon} ${a.name}</div><div class="m">${t.name}${a.rate ? ` · ${a.rate}%` : ''}${a.maturity ? ` · 到期 ${a.maturity}` : ''}${a.note ? ` · ${a.note}` : ''}</div>${matBadge(a)}</div>
            <div class="r"><div class="v">${fmt(a.amount)} 萬</div></div>
            <button class="x" onclick="assetForm('${a.id}')">✎</button><button class="x" onclick="del('assets','${a.id}')">×</button>
          </div>`;
        }).join('')}
      ` : '<div class="empty">還沒有其他資產<br>點「+ 新增」加入定存、儲蓄險等</div>'}
    </div>`;
}

function matBadge(a){
  if(!a.maturity) return '';
  const d=Math.ceil((new Date(a.maturity)-new Date())/86400000);
  if(d<0) return '<div style="font-size:11px;color:var(--red);margin-top:2px">⚠️ 已到期，請更新</div>';
  if(d<=60) return `<div style="font-size:11px;color:var(--gold-d);margin-top:2px">⏰ ${d} 天後到期</div>`;
  return '';
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
    <div class="row">
      <div class="fg"><label class="fl">到期日（選填）</label><input class="fi" type="date" id="f_mat" value="${a?.maturity || ''}"></div>
      <div class="fg"><label class="fl">配息方式</label><select class="fi" id="f_payout">
        <option value="" ${!a?.payout?'selected':''}>不配息／複利滾入</option>
        <option value="annual" ${a?.payout==='annual'?'selected':''}>每年領息</option>
        <option value="monthly" ${a?.payout==='monthly'?'selected':''}>每月領息</option>
        <option value="maturity" ${a?.payout==='maturity'?'selected':''}>到期一次領</option>
      </select></div>
    </div>
    <div class="fg"><label class="fl">備註</label><input class="fi" id="f_note" value="${a?.note || ''}" placeholder="如：中國信託一年期"></div>`, () => {
    const name = document.getElementById('f_name').value.trim();
    const amt = parseFloat(document.getElementById('f_amt').value);
    if (!name || isNaN(amt)) { toast('名稱與金額為必填', 1); return false; }
    const o = a || { id: uid('a') };
    o.type = document.getElementById('f_type').value;
    o.name = name; o.amount = amt;
    o.rate = parseFloat(document.getElementById('f_rate').value) || 0;
    o.note = document.getElementById('f_note').value.trim();
    o.maturity = document.getElementById('f_mat').value;
    o.payout = document.getElementById('f_payout').value;
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


/* ---------- 股息專區 ---------- */
function renderDividends() {
  const el = document.getElementById('p-dividends');
  const withDiv = D.stocks.filter(s => s.lastDivDate || s.yield);
  const annual = D.stocks.reduce((a,s)=>a+annualDivEst(s)*(s.lots||0)*1000/10000, 0);
  // 預估未來 12 個月配息行事曆
  const cal = [];
  D.stocks.forEach(s => {
    if (!s.lastDivDate || !s.freq) return;
    const gap = 365/s.freq;
    const per = perDivEst(s);
    let d = new Date(s.lastDivDate*1000);
    for (let i=0;i<s.freq+1;i++) {
      d = new Date(d.getTime()+gap*86400000);
      if (d > new Date() && d < new Date(Date.now()+400*86400000)) {
        cal.push({ code:s.code, ex:d, pay:new Date(d.getTime()+38*86400000),
                   amt:per*(s.lots||0)*1000, per, src:s.divOverride?'自訂':'最近一次', est:true });
      }
    }
  });
  cal.sort((a,b)=>a.ex-b.ex);
  const next12 = cal.reduce((a,c)=>a+c.amt,0);
  const logTotal = (D.dividends||[]).reduce((a,d)=>a+d.amount,0);
  const thisYear = (D.dividends||[]).filter(d=>d.date.startsWith(String(new Date().getFullYear()))).reduce((a,d)=>a+d.amount,0);

  el.innerHTML = `
    <div class="dash">
      <div class="dcard"><div class="dl">🧧 預估年配息</div><div class="dv up">${fmt(annual)}</div><div class="dm">月均 ${fmt(annual/12,2)} 萬</div></div>
      <div class="dcard"><div class="dl">📅 未來12月預估</div><div class="dv">${fmt0(next12/10000)}</div><div class="dm">萬元 · ${cal.length} 次配息</div></div>
      <div class="dcard"><div class="dl">💰 今年已領</div><div class="dv">${fmt0(thisYear/10000)}</div><div class="dm">萬元</div></div>
      <div class="dcard"><div class="dl">📜 累計已領</div><div class="dv">${fmt0(logTotal/10000)}</div><div class="dm">萬元</div></div>
    </div>

    <div class="card">
      <div class="ct">📅 配息行事曆</div>
      <div class="cs">依各檔歷史配息頻率與金額推估 · 發放日約除息後 38 天（台股實務約 30~45 天）</div>
      ${cal.length ? cal.slice(0,10).map(c=>{
        const days = Math.ceil((c.ex-new Date())/86400000);
        return `<div class="item">
          <span class="dot" style="background:${days<=14?'var(--gold)':'var(--line)'}"></span>
          <div><div class="n">${c.code} <span style="font-weight:400;font-size:11.5px;color:var(--soft)">每股 ${fmt(c.per,2)} 元（${c.src}）</span></div>
          <div class="m">除息 ${c.ex.toLocaleDateString('zh-TW',{month:'numeric',day:'numeric'})} · 入帳 ${c.pay.toLocaleDateString('zh-TW',{month:'numeric',day:'numeric'})} · ${days} 天後</div></div>
          <div class="r"><div class="v up">${fmt0(c.amt)}</div><div style="font-size:10px;color:var(--soft)">元</div></div>
        </div>`;
      }).join('') : '<div class="empty">尚無資料<br>請先到「股票」按更新，系統會自動抓取配息歷史</div>'}
      <div style="font-size:11px;color:var(--soft);margin-top:8px">※ 金額以<b>最近一次實際配息</b>推估，日期依歷史頻率估算；實際請以各投信公告為準<br>※ 投信已公告下期金額時，可到「股票」編輯該檔的「下期配息」欄位手動覆寫</div>
    </div>

    <div class="card">
      <div class="ct">🧧 領息紀錄 <button class="btn b1 bs" onclick="divForm()">+ 記一筆</button></div>
      <div class="cs">實際入帳後記錄，追蹤真實現金流</div>
      ${(D.dividends||[]).length ? [...D.dividends].sort((a,b)=>b.date.localeCompare(a.date)).map(d=>`
        <div class="item"><span class="dot" style="background:var(--green)"></span>
          <div><div class="n">${d.code}</div><div class="m">${d.date}${d.note?' · '+d.note:''}</div></div>
          <div class="r"><div class="v up">+${d.amount.toLocaleString()}</div></div>
          <button class="x" onclick="del('dividends','${d.id}')">×</button>
        </div>`).join('') : '<div class="empty">還沒有領息紀錄</div>'}
    </div>

    <div class="card">
      <div class="ct">📊 各檔配息貢獻</div><div class="cs">依目前持股與殖利率估算年配息</div>
      ${!D.stocks.length ? '<div class="empty">尚未加入持股</div>' : !D.stocks.some(s=>s.yield) ? '<div class="empty">尚無殖利率資料<br>到「股票」按更新即可自動取得</div>' : ''}
      ${D.stocks.filter(s=>annualDivEst(s)>0).sort((a,b)=>annualDivEst(b)*b.lots-annualDivEst(a)*a.lots).map(s=>{
        const d=annualDivEst(s)*(s.lots||0)*1000/10000, pctv=annual?d/annual*100:0;
        const yr = yieldEst(s);
        const yoc = s.cost? (annualDivEst(s)/s.cost*100) : 0;
        return `<div style="margin-bottom:11px">
          <div class="mini"><span><b>${s.code}</b> ${yr.toFixed(1)}%${yoc?` <span style="color:var(--green)">(成本殖利率 ${yoc.toFixed(1)}%)</span>`:''}</span><span><b>${fmt(d,1)}</b> 萬/年</span></div>
          <div class="bar"><div style="width:${pctv}%;background:var(--gold)"></div></div>
        </div>`;
      }).join('')}
      <div class="note" style="margin-top:6px">💡 <b>成本殖利率</b>＝年配息 ÷ 你的持有成本。長期持有的低成本部位，成本殖利率會遠高於市場殖利率——這就是不隨意賣出的價值。</div>
    </div>
  `;
}
/* ===== 配息估算規則（全站統一）=====
   每期（行事曆用）：手動覆寫 > 最近一次實際配息
   年度（殖利率/被動收入/貢獻用）：手動×頻率 > 近12個月實際合計 > 最近一次×頻率
   註：不用「最近一次×頻率」當預設，因各期金額差異大會失真 */
function perDivEst(s) {
  if (s.divOverride) return s.divOverride;
  if (s.lastDivAmount) return s.lastDivAmount;
  const h = s.divHistory || [];
  return h.length ? h.slice(-4).reduce((a, d) => a + d.amount, 0) / Math.min(4, h.length) : 0;
}
function sumLast12(s) {
  if (s.annual12) return s.annual12;
  const h = s.divHistory || [];
  if (!h.length) return 0;
  const now = Date.now() / 1000;
  const v = h.filter(d => now - d.date < 365 * 86400).reduce((a, d) => a + d.amount, 0);
  return v || (s.lastDivAmount || 0) * (s.freq || 4);
}
function annualDivEst(s) {
  if (s.divOverride) return s.divOverride * (s.freq || 4);
  return sumLast12(s) || perDivEst(s) * (s.freq || 4);
}
/* 殖利率（與年配息同源，確保一致） */
function yieldEst(s) {
  if (s.price && annualDivEst(s)) return annualDivEst(s) / s.price * 100;
  return s.yield || 0;
}

function divForm() {
  modal('記錄領息', `
    <div class="row">
      <div class="fg"><label class="fl">標的 *</label>
        <select class="fi" id="f_code">${D.stocks.map(s=>`<option value="${s.code}">${s.code} ${s.name||''}</option>`).join('')}<option value="其他">其他</option></select></div>
      <div class="fg"><label class="fl">入帳日期</label><input class="fi" type="date" id="f_date" value="${new Date().toISOString().slice(0,10)}"></div>
    </div>
    <div class="fg"><label class="fl">金額（元）*</label><input class="fi" type="number" id="f_amt" placeholder="13000"></div>
    <div class="fg"><label class="fl">備註</label><input class="fi" id="f_note" placeholder="如：Q2 季配"></div>`, () => {
    const a = parseFloat(document.getElementById('f_amt').value);
    if (!a) { toast('請填金額',1); return false; }
    if (!D.dividends) D.dividends = [];
    D.dividends.push({ id:uid('d'), date:document.getElementById('f_date').value, code:document.getElementById('f_code').value,
      amount:Math.round(a), note:document.getElementById('f_note').value.trim() });
    save(); render(); toast('已記錄'); return true;
  });
}

/* ---------- 不動產 ---------- */
function renderRealty() {
  const el = document.getElementById('p-realty');
  el.innerHTML = `
    <div class="card">
      <div class="ct">🏠 不動產與房貸 <button class="btn b1 bs" onclick="realtyForm()">+ 新增</button></div>
      <div class="cs">預售屋可先試算未來房貸；成屋可設定分段利率與寬限期</div>
      ${D.realties.length ? D.realties.map(r => realtyCard(r)).join('') : '<div class="empty">還沒有不動產<br>點「+ 新增」登記房產或試算房貸</div>'}
    </div>`;
}

function realtyCard(r) {
  const sim = simLoan(r);
  const yNow = loanYearNow(r);
  const isPresale = r.stage === 'presale';
  const payNow = currentMonthlyPay(r);
  const rem = remainLoan(r);
  const paid = r.paidAmount || 0;
  const pending = Math.max(0, (r.totalPrice||0) - paid - (r.loanAmount||0));
  return `<div style="border:1px solid var(--line);border-radius:12px;padding:16px;margin-bottom:12px">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
      <b style="font-size:16px">${r.name}</b>
      <span class="tag ${isPresale?'tn':'tg'}">${isPresale?'預售屋':'成屋'}</span>
      ${yNow>0?`<span class="tag tg">第 ${yNow} 年</span>`:''}
      <button class="x" style="margin-left:auto" onclick="realtyForm('${r.id}')">✎</button>
      <button class="x" onclick="del('realties','${r.id}')">×</button>
    </div>
    <div class="grid" style="margin:0 0 12px">
      <div class="st"><div class="l">購買總價</div><div class="v">${fmt0(r.totalPrice)} 萬</div></div>
      <div class="st"><div class="l">已付款</div><div class="v">${fmt0(paid)} 萬</div></div>
      <div class="st"><div class="l">${yNow>0?'貸款餘額':'預計貸款'}</div><div class="v">${fmt0(yNow>0?rem:(r.loanAmount||0))} 萬</div></div>
      <div class="st"><div class="l">${yNow>0?'目前月付':'首期月付'}</div><div class="v">${fmt(yNow>0?payNow:(sim.phases[0]?.monthly||0),2)} 萬</div></div>
    </div>
    ${pending>0?`<div style="font-size:12px;color:var(--gold-d);background:#fdf6ea;border-radius:8px;padding:9px 11px;margin-bottom:12px">⏳ 交屋前尚需自備 <b>${fmt0(pending)} 萬</b>（總價 − 已付 − 貸款）</div>`:''}
    ${sim.phases.length?`
      <div class="sec" style="margin:6px 0 8px">📋 還款期程試算</div>
      <div style="overflow-x:auto"><table>
        <tr><th>期間</th><th>利率</th><th>月付(萬)</th><th>該段利息</th><th>期末餘額</th></tr>
        ${sim.phases.map(p=>`<tr>
          <td>第 ${p.y1}-${p.y2} 年${p.grace?' <span class="tag tn">寬限</span>':''}</td>
          <td>${p.rate}%</td><td><b>${fmt(p.monthly,2)}</b></td>
          <td>${fmt0(p.interest)} 萬</td><td>${fmt0(p.endBal)} 萬</td>
        </tr>`).join('')}
      </table></div>
      <div style="font-size:12px;color:var(--muted);margin-top:10px;line-height:1.9">
        總利息約 <b>${fmt0(sim.totalInterest)} 萬</b> · 本息合計 <b>${fmt0((r.loanAmount||0)+sim.totalInterest)} 萬</b>
        ${sim.phases.length>1?`<br>⚠️ 第 ${sim.phases[0].y2+1} 年起月付由 ${fmt(sim.phases[0].monthly,2)} 萬升至 <b>${fmt(sim.phases[1].monthly,2)} 萬</b>（+${fmt(sim.phases[1].monthly-sim.phases[0].monthly,2)} 萬），請預先規劃現金流`:''}
      </div>`:'<div style="font-size:12.5px;color:var(--soft)">尚未設定貸款條件，點 ✎ 編輯可試算</div>'}
  </div>`;
}

let RF_PHASES = [];
function realtyForm(id) {
  const r = id ? D.realties.find(x=>x.id===id) : null;
  const y = new Date().getFullYear();
  RF_PHASES = r ? JSON.parse(JSON.stringify(getPhases(r))) : [{y1:1,y2:3,rate:2.0,grace:true},{y1:4,y2:30,rate:2.2}];
  modal(`${r?'編輯':'新增'}不動產`, `
    <div class="fg"><label class="fl">房產類型</label>
      <select class="fi" id="f_stage" onchange="rfStage()">
        <option value="presale" ${r?.stage!=='existing'?'selected':''}>🏗️ 預售屋（尚未交屋/未起貸）</option>
        <option value="existing" ${r?.stage==='existing'?'selected':''}>🏠 成屋（已交屋，貸款中或即將開始）</option>
      </select></div>
    <div class="fg"><label class="fl">名稱 *</label><input class="fi" id="f_name" value="${r?.name||''}" placeholder="如：台中自住宅"></div>
    <div class="row">
      <div class="fg"><label class="fl">購買總價（萬）*</label><input class="fi" type="number" id="f_total" value="${r?.totalPrice??''}"></div>
      <div class="fg"><label class="fl">已付款（萬）</label><input class="fi" type="number" id="f_paid" value="${r?.paidAmount??''}" placeholder="頭期+工程款"></div>
    </div>
    <div class="sec">💰 貸款試算</div>
    <div class="row">
      <div class="fg"><label class="fl">貸款金額（萬）</label><input class="fi" type="number" id="f_loan" value="${r?.loanAmount??''}"></div>
      <div class="fg"><label class="fl">總年限</label><input class="fi" type="number" id="f_years" value="${r?.years??30}"></div>
    </div>
    <div class="fg" id="f_startwrap"><label class="fl">起貸年份</label><input class="fi" type="number" id="f_start" value="${r?.loanStartYear??y}" placeholder="預售屋填預計交屋年"></div>
    <div class="sec">📊 分段利率<button class="btn b3" style="float:right;padding:2px 8px" onclick="rfAddPhase()">+ 加一段</button></div>
    <div style="font-size:11.5px;color:var(--soft);margin-bottom:8px">可設定寬限期與不同年期的利率，系統自動計算各段月付</div>
    <div id="f_phases"></div>`, () => {
    const name=document.getElementById('f_name').value.trim();
    const total=parseFloat(document.getElementById('f_total').value);
    if(!name||isNaN(total)){toast('名稱與總價為必填',1);return false;}
    rfSync();
    const o = r || { id: uid('r') };
    o.stage=document.getElementById('f_stage').value;
    o.name=name; o.totalPrice=total;
    o.paidAmount=parseFloat(document.getElementById('f_paid').value)||0;
    o.loanAmount=parseFloat(document.getElementById('f_loan').value)||0;
    o.years=parseInt(document.getElementById('f_years').value)||30;
    o.loanStartYear=parseInt(document.getElementById('f_start').value)||y;
    o.phases=RF_PHASES.filter(p=>p.y1&&p.y2);
    if(!r) D.realties.push(o);
    save(); render(); return true;
  });
  rfRender();
}
function rfStage(){}
function rfRender() {
  const box=document.getElementById('f_phases');
  if(!box) return;
  box.innerHTML = RF_PHASES.map((p,i)=>`
    <div class="row" style="align-items:flex-end;background:var(--bg);border-radius:9px;padding:9px;margin-bottom:7px">
      <div class="fg" style="min-width:52px;margin-bottom:0"><label class="fl">起(年)</label><input class="fi" type="number" value="${p.y1}" onchange="RF_PHASES[${i}].y1=+this.value"></div>
      <div class="fg" style="min-width:52px;margin-bottom:0"><label class="fl">迄(年)</label><input class="fi" type="number" value="${p.y2}" onchange="RF_PHASES[${i}].y2=+this.value"></div>
      <div class="fg" style="min-width:62px;margin-bottom:0"><label class="fl">利率%</label><input class="fi" type="number" step="0.01" value="${p.rate}" onchange="RF_PHASES[${i}].rate=+this.value"></div>
      <div class="fg" style="min-width:70px;margin-bottom:0"><label class="fl">月付(萬)</label><input class="fi" type="number" step="0.01" value="${p.pay||''}" placeholder="自動" onchange="RF_PHASES[${i}].pay=+this.value||0"></div>
      <div class="fg" style="flex:0 0 auto;margin-bottom:0;text-align:center">
        <label class="fl">寬限</label><input type="checkbox" ${p.grace?'checked':''} onchange="RF_PHASES[${i}].grace=this.checked" style="width:20px;height:20px">
      </div>
      <button class="x" onclick="RF_PHASES.splice(${i},1);rfRender()">×</button>
    </div>`).join('');
}
function rfAddPhase(){
  const last=RF_PHASES[RF_PHASES.length-1];
  RF_PHASES.push({y1:(last?.y2||0)+1, y2:(last?.y2||0)+10, rate:last?.rate||2.2});
  rfRender();
}
function rfSync(){}


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
      <div class="row">
        <div class="fg"><label class="fl">月收入（萬）</label><input class="fi" type="number" step="0.5" value="${p.monthlyIncome||''}" onchange="setP('monthlyIncome',this.value)"></div>
        <div class="fg"><label class="fl">月支出（萬）</label><input class="fi" type="number" step="0.5" value="${p.monthlyExpense||''}" onchange="setP('monthlyExpense',this.value)"></div>
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
      <div class="cs">目前模式：<b>${getMode()==='session'?'僅本次瀏覽':'一直保留'}</b> · 換裝置或清快取前請先匯出</div>
      <div class="row" style="margin-bottom:10px">
        <button class="btn ${getMode()==='local'?'b1':'b2'}" style="flex:1" onclick="switchMode('local')">🔒 一直保留</button>
        <button class="btn ${getMode()==='session'?'b1':'b2'}" style="flex:1" onclick="switchMode('session')">🕶️ 僅本次</button>
      </div>
      <div class="row">
        <button class="btn b1" style="flex:1" onclick="expJson()">⬇ 匯出 JSON</button>
        <button class="btn b2" style="flex:1" onclick="document.getElementById('impFile').click()">⬆ 匯入 JSON</button>
      </div>
      <input type="file" id="impFile" accept=".json" style="display:none" onchange="impJson(this)">
      <button class="btn b2 full" style="margin-top:8px" onclick="startOnboard()">🧭 重新執行引導設定</button>
      <button class="btn b3 full" style="margin-top:6px;color:var(--red)" onclick="resetAll()">🗑 清除所有資料</button>
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

function switchMode(m) {
  if (m === 'session' && !confirm('切換為「僅本次瀏覽」：\n\n資料將改存在分頁記憶體，關閉分頁後即清除。\n建議離開前先匯出 JSON 備份。\n\n確定切換？')) return;
  setMode(m); save(); render();
  toast(m === 'session' ? '已切換：關閉分頁後資料即清除' : '已切換：資料會保留在本瀏覽器');
}
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
  renderOverview(); renderStocks(); renderDividends(); renderAssets(); renderRealty(); renderSettings();
}
document.addEventListener('DOMContentLoaded', () => {
  load();
  document.querySelectorAll('.tab').forEach(b => b.onclick = () => go(b.dataset.p));
  render();
  if (needOnboard()) setTimeout(startOnboard, 400);
});
