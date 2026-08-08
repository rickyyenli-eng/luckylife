/* 引導式設定 */
let OB = { step: 0, data: {} };
const OB_STEPS = 7;

function needOnboard() {
  return !D.profile.onboarded && !D.stocks.length && !D.assets.length && !D.realties.length;
}

function startOnboard() {
  // 若已有資料，先確認要覆蓋還是取消（避免重複新增）
  const hasData = D.stocks.length || D.assets.length || D.realties.length;
  if (hasData) {
    if (!confirm('重新執行引導設定會「取代」目前的持股、其他資產與不動產資料。\n\n建議先到「設定 → 匯出 JSON」備份。\n\n確定要重新設定嗎？')) return;
  }
  OB = { step: 1, replace: !!hasData,
         data: { age: '', gender: '', stocks: [], assets: [], realty: null, plans: [] } };
  renderOb();
}

function obNext() { OB.step++; if (OB.step > OB_STEPS) finishOb(); else renderOb(); }
function obPrev() { if (OB.step > 1) { OB.step--; renderOb(); } }
function obSkip() { OB.step = OB_STEPS + 1; finishOb(); }

function renderOb() {
  const el = document.getElementById('obLayer');
  el.classList.add('on');
  const pct = (OB.step / OB_STEPS) * 100;
  let body = '';
  const d = OB.data;

  switch (OB.step) {
    case 1: body = `
      <div class="ob-icon">👋</div>
      <h2>先認識一下你</h2>
      <p class="ob-sub">這些資料只存在你的手機/電腦，不會上傳</p>
      <div class="row">
        <div class="fg"><label class="fl">目前年齡</label><input class="fi" type="number" id="o_age" value="${d.age||''}" placeholder="例：35" min="15" max="90"></div>
        <div class="fg"><label class="fl">性別（選填）</label>
          <select class="fi" id="o_gender">
            <option value="">不提供</option><option value="m" ${d.gender==='m'?'selected':''}>男性</option>
            <option value="f" ${d.gender==='f'?'selected':''}>女性</option><option value="o" ${d.gender==='o'?'selected':''}>其他</option>
          </select></div>
      </div>`; break;

    case 2: body = `
      <div class="ob-icon">💵</div>
      <h2>每月收支狀況</h2>
      <p class="ob-sub">用來計算你每月能投入多少</p>
      <div class="row">
        <div class="fg"><label class="fl">月收入（萬）</label><input class="fi" type="number" step="0.5" id="o_income" value="${d.income||''}" placeholder="稅後實領"></div>
        <div class="fg"><label class="fl">月支出（萬）</label><input class="fi" type="number" step="0.5" id="o_expense" value="${d.expense||''}" placeholder="含房租/生活"></div>
      </div>
      <div class="ob-hint" id="o_surplus"></div>`; break;

    case 3: body = `
      <div class="ob-icon">📊</div>
      <h2>你有台股持股嗎？</h2>
      <p class="ob-sub">上市櫃個股、ETF 都可以，之後隨時能增減</p>
      <div id="o_stocklist">${obStockList()}</div>
      <div class="row" style="align-items:flex-end">
        <div class="fg" style="min-width:88px"><label class="fl">代號</label><input class="fi" id="o_sc" placeholder="0050"></div>
        <div class="fg" style="min-width:70px"><label class="fl">張數</label><input class="fi" type="number" step="0.001" id="o_sl" placeholder="10"></div>
        <div class="fg" style="min-width:80px"><label class="fl">平均成本</label><input class="fi" type="number" step="0.01" id="o_sp" placeholder="65"></div>
        <div class="fg" style="flex:0 0 auto"><button class="btn b2" onclick="obAddStock()">加入</button></div>
      </div>`; break;

    case 4: body = `
      <div class="ob-icon">💰</div>
      <h2>其他資產</h2>
      <p class="ob-sub">定存、儲蓄險、黃金…有多少填多少</p>
      <div id="o_assetlist">${obAssetList()}</div>
      <div class="row" style="align-items:flex-end">
        <div class="fg" style="min-width:100px"><label class="fl">類別</label>
          <select class="fi" id="o_at">${Object.entries(ASSET_TYPES).map(([k,v])=>`<option value="${k}">${v.icon} ${v.name}</option>`).join('')}</select></div>
        <div class="fg" style="min-width:80px"><label class="fl">金額(萬)</label><input class="fi" type="number" step="0.1" id="o_aa" placeholder="50"></div>
        <div class="fg" style="min-width:70px"><label class="fl">年報酬%</label><input class="fi" type="number" step="0.1" id="o_ar" placeholder="自動"></div>
        <div class="fg" style="flex:0 0 auto"><button class="btn b2" onclick="obAddAsset()">加入</button></div>
      </div>`; break;

    case 5: body = `
      <div class="ob-icon">🏠</div>
      <h2>有房子或預售屋嗎？</h2>
      <p class="ob-sub">沒有的話直接按「下一步」跳過</p>
      <div class="row">
        <div class="fg"><label class="fl">房產類型</label><select class="fi" id="o_rs">
          <option value="">沒有房產</option>
          <option value="presale" ${d.realty?.stage==='presale'?'selected':''}>🏗️ 預售屋</option>
          <option value="existing" ${d.realty?.stage==='existing'?'selected':''}>🏠 成屋</option>
        </select></div>
        <div class="fg"><label class="fl">用途</label><select class="fi" id="o_rpp">
          <option value="self" ${d.realty?.purpose!=='rent'?'selected':''}>🏠 自住</option>
          <option value="rent" ${d.realty?.purpose==='rent'?'selected':''}>🏘️ 出租</option>
        </select></div>
      </div>
      <div class="fg"><label class="fl">月租金（萬，出租才填）</label><input class="fi" type="number" step="0.1" id="o_rrent" value="${d.realty?.monthlyRent||''}" placeholder="如 2.5"></div>
      <div class="fg"><label class="fl">名稱</label><input class="fi" id="o_rn" value="${d.realty?.name||''}" placeholder="如：自住宅"></div>
      <div class="row">
        <div class="fg"><label class="fl">購買總價（萬）</label><input class="fi" type="number" id="o_rb" value="${d.realty?.totalPrice||''}"></div>
        <div class="fg"><label class="fl">已付款（萬）</label><input class="fi" type="number" id="o_rp" value="${d.realty?.paidAmount||''}" placeholder="頭期+工程款"></div>
      </div>
      <div class="row">
        <div class="fg"><label class="fl">貸款金額（萬）</label><input class="fi" type="number" id="o_rl" value="${d.realty?.loanAmount||''}"></div>
        <div class="fg"><label class="fl">年限</label><input class="fi" type="number" id="o_ry" value="${d.realty?.years??30}"></div>
      </div>
      <div class="row">
        <div class="fg"><label class="fl">起貸年份</label><input class="fi" type="number" id="o_rsy" value="${d.realty?.loanStartYear??new Date().getFullYear()}"></div>
        <div class="fg"><label class="fl">利率 %</label><input class="fi" type="number" step="0.01" id="o_rr" value="${d.realty?.rate??2.1}"></div>
        <div class="fg"><label class="fl">寬限期(年)</label><input class="fi" type="number" id="o_rg" value="${d.realty?.graceYears??0}"></div>
      </div>
      <div class="ob-hint">💡 之後可在「不動產」頁設定分段利率（如前3年寬限、4-20年、21-30年不同利率）</div>`; break;

    case 6: body = `
      <div class="ob-icon">📅</div>
      <h2>未來有什麼計畫？</h2>
      <p class="ob-sub">可複選，我們會提醒你預留資金</p>
      <div class="ob-chips">
        ${[['buy','🏠 買房'],['car','🚗 買車'],['marry','💍 結婚'],['baby','👶 生小孩'],['study','🎓 進修'],['travel','✈️ 旅遊基金'],['parent','👵 奉養父母'],['none','😌 暫時沒有']].map(([k,l])=>
          `<button class="chip ${d.plans.includes(k)?'on':''}" onclick="obTogglePlan('${k}')">${l}</button>`).join('')}
      </div>`; break;

    case 7: body = `
      <div class="ob-icon">🎯</div>
      <h2>你的退休目標</h2>
      <p class="ob-sub">可以先隨意填，之後隨時能改</p>
      <div class="row">
        <div class="fg"><label class="fl">希望幾歲退休</label><input class="fi" type="number" id="o_ra" value="${d.retireAge||Math.max((d.age||30)+10,55)}" min="${(d.age||30)+1}" max="90"></div>
        <div class="fg"><label class="fl">目標資產（萬）</label><input class="fi" type="number" step="100" id="o_ta" value="${d.targetAsset||2000}"></div>
      </div>
      <div class="fg"><label class="fl">目標月被動收入（萬）</label><input class="fi" type="number" step="0.5" id="o_ti" value="${d.targetIncome||5}"></div>
      <div class="fg"><label class="fl">每月可投入（萬）</label><input class="fi" type="number" step="0.5" id="o_mi" value="${d.monthlyInvest ?? Math.max(0,(d.income||0)-(d.expense||0))}"></div>
      <div class="ob-hint">💡 依你填的收支，每月結餘約 ${fmt(Math.max(0,(d.income||0)-(d.expense||0)),1)} 萬</div>`; break;
  }

  el.innerHTML = `<div class="ob-box">
    <div class="ob-bar"><div style="width:${pct}%"></div></div>
    <div class="ob-step">步驟 ${OB.step} / ${OB_STEPS}</div>
    ${body}
    <div class="row" style="margin-top:20px">
      ${OB.step>1?'<button class="btn b2" style="flex:0 0 88px" onclick="obPrev()">上一步</button>':''}
      <button class="btn b1" style="flex:1" onclick="obSave()">${OB.step===OB_STEPS?'完成 ✓':'下一步 →'}</button>
    </div>
    <button class="btn b3 full" style="margin-top:6px" onclick="obSkip()">略過引導，直接使用</button>
  </div>`;

  if (OB.step === 2) {
    const upd = () => {
      const i = parseFloat(document.getElementById('o_income').value)||0;
      const e = parseFloat(document.getElementById('o_expense').value)||0;
      document.getElementById('o_surplus').innerHTML = (i||e) ? `💡 每月結餘約 <b>${fmt(Math.max(0,i-e),1)} 萬</b>，這是你能投資的金額` : '';
    };
    ['o_income','o_expense'].forEach(id=>document.getElementById(id).oninput=upd); upd();
  }
}

function obStockList() {
  if (!OB.data.stocks.length) return '<div class="ob-empty">還沒加入持股（沒有的話可直接下一步）</div>';
  return OB.data.stocks.map((s,i)=>`<div class="ob-row"><b>${s.code}</b> ${fmt(s.lots,2)}張 @ ${fmt(s.cost,2)}<button class="x" onclick="OB.data.stocks.splice(${i},1);renderOb()">×</button></div>`).join('');
}
function obAddStock() {
  const c=document.getElementById('o_sc').value.trim().toUpperCase(), l=parseFloat(document.getElementById('o_sl').value), p=parseFloat(document.getElementById('o_sp').value);
  if(!c||!l||isNaN(p)){toast('請填代號、張數、成本',1);return;}
  OB.data.stocks.push({code:c,lots:l,cost:p}); renderOb();
}
function obAssetList() {
  if (!OB.data.assets.length) return '<div class="ob-empty">還沒加入其他資產</div>';
  return OB.data.assets.map((a,i)=>{const t=ASSET_TYPES[a.type];return `<div class="ob-row">${t.icon} <b>${t.name}</b> ${fmt(a.amount)}萬 · ${a.rate}%<button class="x" onclick="OB.data.assets.splice(${i},1);renderOb()">×</button></div>`}).join('');
}
function obAddAsset() {
  const t=document.getElementById('o_at').value, a=parseFloat(document.getElementById('o_aa').value);
  if(isNaN(a)){toast('請填金額',1);return;}
  const r=parseFloat(document.getElementById('o_ar').value);
  OB.data.assets.push({type:t,amount:a,rate:isNaN(r)?ASSET_TYPES[t].defRate:r}); renderOb();
}
function obTogglePlan(k) {
  const p=OB.data.plans;
  if(k==='none'){OB.data.plans=p.includes('none')?[]:['none'];}
  else{const i=p.indexOf(k); i>=0?p.splice(i,1):p.push(k); OB.data.plans=p.filter(x=>x!=='none');}
  renderOb();
}

function obSave() {
  const d = OB.data, g = id => document.getElementById(id);
  switch (OB.step) {
    case 1: d.age=parseInt(g('o_age').value)||30; d.gender=g('o_gender').value; break;
    case 2: d.income=parseFloat(g('o_income').value)||0; d.expense=parseFloat(g('o_expense').value)||0; break;
    case 5:
      const stage = g('o_rs').value;
      if (stage && g('o_rn').value.trim() && parseFloat(g('o_rb').value)) {
        const rate = parseFloat(g('o_rr').value)||2.1, yrs = parseInt(g('o_ry').value)||30, gr = parseInt(g('o_rg').value)||0;
        d.realty = { stage, purpose:g('o_rpp').value, monthlyRent:parseFloat(g('o_rrent').value)||0, vacancy:1,
          name:g('o_rn').value.trim(), totalPrice:parseFloat(g('o_rb').value),
          paidAmount:parseFloat(g('o_rp').value)||0, loanAmount:parseFloat(g('o_rl').value)||0,
          years:yrs, loanStartYear:parseInt(g('o_rsy').value)||new Date().getFullYear(),
          phases: gr>0 ? [{y1:1,y2:gr,rate,grace:true},{y1:gr+1,y2:yrs,rate}] : [{y1:1,y2:yrs,rate}] };
      } else d.realty = null;
      break;
    case 7: d.retireAge=parseInt(g('o_ra').value)||60; d.targetAsset=parseFloat(g('o_ta').value)||2000; d.targetIncome=parseFloat(g('o_ti').value)||5; d.monthlyInvest=parseFloat(g('o_mi').value)||0; break;
  }
  obNext();
}

async function finishOb() {
  const d = OB.data;
  D.profile = { ...D.profile, age:parseInt(d.age)||30, gender:d.gender||'', retireAge:d.retireAge||60, monthlyIncome:d.income||0, monthlyExpense:d.expense||0,
    monthlyInvest:d.monthlyInvest??Math.max(0,(d.income||0)-(d.expense||0)), targetAsset:d.targetAsset||2000,
    targetIncome:d.targetIncome||5, plans:d.plans||[], onboarded:true };
  // 重新引導時取代原資料，避免重複
  if (OB.replace) { D.stocks = []; D.assets = []; D.realties = []; }
  d.stocks.forEach(s=>D.stocks.push({id:uid('s'),code:s.code,name:'',lots:s.lots,cost:s.cost,price:0,yield:0}));
  d.assets.forEach(a=>D.assets.push({id:uid('a'),type:a.type,name:ASSET_TYPES[a.type].name,amount:a.amount,rate:a.rate,note:''}));
  if (d.realty) D.realties.push({id:uid('r'),...d.realty});
  save();
  document.getElementById('obLayer').classList.remove('on');
  render();
  if (D.stocks.some(s=>!s.price)) { toast('正在抓取股價…'); await updateAllPrices(); render(); toast('設定完成！歡迎使用 🎉'); }
  else toast('設定完成！歡迎使用 🎉');
}
