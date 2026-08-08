/* AssetFlow · 資料層 */
const SK = 'assetflow_v1';
const MK = 'assetflow_mode';   // 'local' | 'session'
function getMode() {
  try { return localStorage.getItem(MK) || sessionStorage.getItem(MK) || 'local'; } catch (e) { return 'local'; }
}
function setMode(m) {
  try {
    if (m === 'session') {
      sessionStorage.setItem(MK, 'session');
      const raw = localStorage.getItem(SK);
      if (raw) sessionStorage.setItem(SK, raw);
      localStorage.removeItem(SK); localStorage.removeItem(MK);
    } else {
      localStorage.setItem(MK, 'local');
      const raw = sessionStorage.getItem(SK);
      if (raw) localStorage.setItem(SK, raw);
      sessionStorage.removeItem(SK); sessionStorage.removeItem(MK);
    }
  } catch (e) {}
}
function store() { return getMode() === 'session' ? sessionStorage : localStorage; }

const ASSET_TYPES = {
  deposit:  { name: '定存 / 現金', icon: '💵', color: '#5b8a72', defRate: 1.5 },
  savings:  { name: '儲蓄險',      icon: '🛡️', color: '#7a9e8e', defRate: 4.0 },
  gold:     { name: '黃金',        icon: '🥇', color: '#d4a017', defRate: 3.0 },
  bond:     { name: '債券',        icon: '📜', color: '#6b7f9e', defRate: 3.5 },
  fund:     { name: '基金',        icon: '📈', color: '#8e7cc3', defRate: 6.0 },
  crypto:   { name: '加密貨幣',    icon: '₿',  color: '#e8a33d', defRate: 0 },
  other:    { name: '其他',        icon: '📦', color: '#a89886', defRate: 2.0 },
};

const DEF = {
  v: 1,
  profile: { age: 30, gender: '', retireAge: 60, targetAsset: 2000, targetIncome: 5, monthlyInvest: 3, monthlyIncome: 0, monthlyExpense: 0, plans: [], onboarded: false, currency: 'TWD' },
  stocks: [],      // +cagr,totalReturn,freq,lastDivDate,lastDivAmount,divHistory
  assets: [],      // {id,type,name,amount,rate,note,maturity,principal,payout}
  realties: [],    // +purpose:'self'|'rent', monthlyRent, otherCost, vacancy(月/年)
  liabilities: [], // {id,name,amount,note}
  dividends: [],   // {id,date,code,amount,note}
  updated: null,
};

let D = null;

function load() {
  try {
    const raw = store().getItem(SK) || localStorage.getItem(SK) || sessionStorage.getItem(SK);
    D = raw ? { ...structuredClone(DEF), ...JSON.parse(raw) } : structuredClone(DEF);
  } catch (e) { D = structuredClone(DEF); }
  return D;
}
function save() {
  D.updated = new Date().toISOString();
  try { store().setItem(SK, JSON.stringify(D)); } catch (e) { toast('儲存失敗：空間不足', 1); }
}
const uid = p => p + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

/* ===== 計算 ===== */
const stockValue = s => (s.lots || 0) * (s.price || 0) * 1000 / 10000;      // 萬
const stockCost  = s => (s.lots || 0) * (s.cost || 0) * 1000 / 10000;
const totalStock = () => D.stocks.reduce((a, s) => a + stockValue(s), 0);
const totalOther = () => D.assets.reduce((a, x) => a + (x.amount || 0), 0);
const totalRealtyPaid = () => D.realties.reduce((a, r) => a + (r.paidAmount || 0), 0);      // 已付出的自備款/工程款
const totalRealtyPrice = () => D.realties.reduce((a, r) => a + (r.totalPrice || 0), 0);     // 購買總價
const totalMortgage = () => D.realties.reduce((a, r) => a + remainLoan(r), 0);              // 貸款餘額

/* ===== 出租現金流 ===== */
// 年有效租金（扣空置月數）
function annualRent(r) {
  if (r.purpose !== 'rent' || !r.monthlyRent) return 0;
  const eff = 12 - Math.min(11, r.vacancy || 0);
  return r.monthlyRent * eff;
}
// 年持有成本（管理費、稅、修繕）
const annualRentCost = r => (r.otherCost || 0) * 12;
// 年房貸支出
const annualMortgagePay = r => currentMonthlyPay(r) * 12;
// 年淨現金流（租金 − 成本 − 房貸）
function netRentFlow(r) {
  if (r.purpose !== 'rent') return 0;
  return annualRent(r) - annualRentCost(r) - annualMortgagePay(r);
}
// 毛租金報酬率（年租金 ÷ 房價）
const grossYield = r => (r.totalPrice ? annualRent(r) / r.totalPrice * 100 : 0);
// 淨租金報酬率（(年租金−成本) ÷ 房價）
const netYield = r => (r.totalPrice ? (annualRent(r) - annualRentCost(r)) / r.totalPrice * 100 : 0);
// 自有資金報酬率 Cash-on-Cash（年淨現金流 ÷ 已投入自備款）
const cashOnCash = r => (r.paidAmount ? netRentFlow(r) / r.paidAmount * 100 : 0);
// 全部房產彙總
const totalAnnualRent = () => D.realties.reduce((a, r) => a + annualRent(r), 0);
const totalNetRentFlow = () => D.realties.reduce((a, r) => a + netRentFlow(r), 0);
const totalDebt = () => D.liabilities.reduce((a, x) => a + (x.amount || 0), 0);
const netWorth = () => totalStock() + totalOther() + totalRealtyPaid() - totalDebt();
const liquidAsset = () => totalStock() + totalOther();

/* ===== 房貸分段引擎 =====
   phases: [{y1, y2, rate, grace:bool, pay:自訂月付(可空)}]
   例：[{y1:1,y2:3,rate:1.775,grace:true},{y1:4,y2:20,rate:2.1},{y1:21,y2:30,rate:2.5}] */
function pmt(P, ratePct, months) {
  if (months <= 0) return 0;
  const r = ratePct / 100 / 12;
  if (r === 0) return P / months;
  return P * r * Math.pow(1 + r, months) / (Math.pow(1 + r, months) - 1);
}
function defPhases(rate, years, grace) {
  const ph = [];
  if (grace > 0) ph.push({ y1: 1, y2: grace, rate, grace: true });
  ph.push({ y1: grace + 1, y2: years, rate });
  return ph;
}
function getPhases(r) {
  if (r.phases && r.phases.length) return r.phases;
  return defPhases(r.rate || 2, r.years || 30, r.graceYears || 0);
}
/* 逐月模擬 → 回傳每段的月付、總利息、餘額走勢 */
function simLoan(r) {
  const P0 = r.loanAmount || 0, years = r.years || 30;
  const ph = getPhases(r);
  const out = { phases: [], totalInterest: 0, schedule: [], P0 };
  if (!P0) return out;
  let bal = P0, totalInt = 0, month = 0;
  for (const p of ph) {
    const mFrom = ((p.y1 || 1) - 1) * 12, mTo = Math.min((p.y2 || years) * 12, years * 12);
    const n = mTo - mFrom;
    if (n <= 0) continue;
    const rm = (p.rate || 0) / 100 / 12;
    // 該段月付：寬限期=只繳息；否則用「剩餘本金 + 剩餘總期數」重算（銀行實務）
    const remainMonths = years * 12 - mFrom;
    const monthly = p.pay || (p.grace ? bal * rm : pmt(bal, p.rate || 0, remainMonths));
    let segInt = 0;
    for (let i = 0; i < n; i++) {
      const int = bal * rm;
      const prin = p.grace ? 0 : Math.min(bal, monthly - int);
      bal = Math.max(0, bal - prin);
      segInt += int; totalInt += int; month++;
      if (month % 12 === 0) out.schedule.push({ year: month / 12, bal, monthly });
    }
    out.phases.push({ ...p, monthly, interest: segInt, endBal: bal, months: n });
  }
  out.totalInterest = totalInt;
  out.endBalance = bal;
  return out;
}
/* 目前是第幾年（1-based）；預售屋未起貸回 0 */
function loanYearNow(r) {
  if (r.stage === 'presale' && !r.loanStartYear) return 0;
  const now = new Date();
  const sy = r.loanStartYear || now.getFullYear();
  const y = now.getFullYear() - sy + 1;
  return y < 1 ? 0 : Math.min(y, r.years || 30);
}
function remainLoan(r) {
  const y = loanYearNow(r);
  if (y <= 0) return 0;                       // 還沒開始還款
  const sim = simLoan(r);
  const row = sim.schedule.filter(x => x.year <= y).pop();
  return row ? row.bal : (r.loanAmount || 0);
}
function currentMonthlyPay(r) {
  const y = loanYearNow(r);
  if (y <= 0) return 0;
  const sim = simLoan(r);
  let acc = 0;
  for (const p of sim.phases) {
    acc += p.months / 12;
    if (y <= acc) return p.monthly;
  }
  return sim.phases.length ? sim.phases[sim.phases.length - 1].monthly : 0;
}
// 年被動收入（萬）
function annualIncome() {
  const div = D.stocks.reduce((a, s) => a + (typeof annualDivEst === 'function'
    ? annualDivEst(s) * (s.lots || 0) * 1000 / 10000
    : stockValue(s) * (s.yield || 0) / 100), 0);
  const oth = D.assets.reduce((a, x) => a + (x.amount || 0) * (x.rate || 0) / 100, 0);
  const rent = D.realties.reduce((a, r) => a + (r.purpose === 'rent' ? annualRent(r) - annualRentCost(r) : 0), 0);
  return div + oth + rent;
}
// 加權年報酬率
function blendedReturn() {
  const tot = liquidAsset();
  if (!tot) return 5;
  let w = 0;
  D.stocks.forEach(s => { w += stockValue(s) * (typeof expReturn==='function' ? expReturn(s) : 7); });
  D.assets.forEach(x => { w += (x.amount || 0) * (x.rate || 0); });
  return w / tot;
}
/* 若要在指定年數內達標，每月需投入多少（萬） */
function requiredMonthly(years) {
  const target = D.profile.targetAsset || 2000;
  const cur = liquidAsset();
  const n = Math.max(1, Math.round(years * 12));
  const rm = blendedReturn() / 100 / 12;
  const fv = cur * Math.pow(1 + rm, n);
  if (fv >= target) return 0;
  const need = target - fv;
  if (rm === 0) return need / n;
  return need * rm / (Math.pow(1 + rm, n) - 1);
}
/* 目標退休年齡剩餘年數 */
function yearsToRetire() {
  const a = D.profile.age || 0, r = D.profile.retireAge || 0;
  return r > a ? r - a : null;
}
// 幾年達標
function yearsToTarget() {
  const target = D.profile.targetAsset || 2000;
  let a = liquidAsset();
  if (a >= target) return 0;
  const rm = blendedReturn() / 100 / 12, m = D.profile.monthlyInvest || 0;
  if (rm <= 0 && m <= 0) return null;
  for (let i = 1; i <= 720; i++) { a = a * (1 + rm) + m; if (a >= target) return i / 12; }
  return null;
}

/* ===== 工具 ===== */
const fmt = (n, d = 1) => (n == null || isNaN(n)) ? '—' : Number(n).toLocaleString('zh-TW', { minimumFractionDigits: d, maximumFractionDigits: d });
const fmt0 = n => fmt(n, 0);
function toast(msg, err) {
  let t = document.getElementById('toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; document.body.appendChild(t); }
  t.textContent = msg; t.style.background = err ? '#9d2933' : '#3d2818';
  t.classList.add('on'); setTimeout(() => t.classList.remove('on'), 2400);
}
