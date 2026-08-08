/* AssetFlow · 資料層 */
const SK = 'assetflow_v1';

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
  stocks: [],      // {id,code,name,lots,cost,price,yield,updated}
  assets: [],      // {id,type,name,amount,rate,note}
  realties: [],    // {id,name,buyPrice,loanAmount,rate,years,graceYears,startYear,monthlyPay,marketValue}
  liabilities: [], // {id,name,amount,note}
  dividends: [],   // {id,date,code,amount,note}
  updated: null,
};

let D = null;

function load() {
  try {
    const raw = localStorage.getItem(SK);
    D = raw ? { ...structuredClone(DEF), ...JSON.parse(raw) } : structuredClone(DEF);
  } catch (e) { D = structuredClone(DEF); }
  return D;
}
function save() {
  D.updated = new Date().toISOString();
  try { localStorage.setItem(SK, JSON.stringify(D)); } catch (e) { toast('儲存失敗：空間不足', 1); }
}
const uid = p => p + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

/* ===== 計算 ===== */
const stockValue = s => (s.lots || 0) * (s.price || 0) * 1000 / 10000;      // 萬
const stockCost  = s => (s.lots || 0) * (s.cost || 0) * 1000 / 10000;
const totalStock = () => D.stocks.reduce((a, s) => a + stockValue(s), 0);
const totalOther = () => D.assets.reduce((a, x) => a + (x.amount || 0), 0);
const totalRealtyEquity = () => D.realties.reduce((a, r) => a + Math.max(0, (r.marketValue || r.buyPrice || 0) - remainLoan(r)), 0);
const totalDebt = () => D.liabilities.reduce((a, x) => a + (x.amount || 0), 0);
const netWorth = () => totalStock() + totalOther() + totalRealtyEquity() - totalDebt();
const liquidAsset = () => totalStock() + totalOther();

// 房貸剩餘本金
function remainLoan(r) {
  const P = r.loanAmount || 0;
  if (!P) return 0;
  const now = new Date();
  const elapsed = Math.max(0, (now.getFullYear() + now.getMonth() / 12) - (r.startYear || now.getFullYear()));
  const grace = r.graceYears || 0;
  if (elapsed <= grace) return P;                       // 寬限期只繳息
  const rm = (r.rate || 2) / 100 / 12;
  const n = ((r.years || 30) - grace) * 12;
  const k = Math.min(n, Math.round((elapsed - grace) * 12));
  if (rm === 0) return Math.max(0, P * (1 - k / n));
  const pmt = P * rm * Math.pow(1 + rm, n) / (Math.pow(1 + rm, n) - 1);
  const bal = P * Math.pow(1 + rm, k) - pmt * (Math.pow(1 + rm, k) - 1) / rm;
  return Math.max(0, bal);
}
// 月付（寬限期/正常期）
function monthlyPay(r, inGrace) {
  const P = r.loanAmount || 0, rm = (r.rate || 2) / 100 / 12;
  if (!P) return 0;
  if (inGrace) return P * rm;
  const n = ((r.years || 30) - (r.graceYears || 0)) * 12;
  if (rm === 0) return P / n;
  return P * rm * Math.pow(1 + rm, n) / (Math.pow(1 + rm, n) - 1);
}
function currentMonthlyPay(r) {
  if (r.monthlyPay) return r.monthlyPay;
  const now = new Date();
  const elapsed = (now.getFullYear() + now.getMonth() / 12) - (r.startYear || now.getFullYear());
  return monthlyPay(r, elapsed <= (r.graceYears || 0));
}
// 年被動收入（萬）
function annualIncome() {
  const div = D.stocks.reduce((a, s) => a + stockValue(s) * (s.yield || 0) / 100, 0);
  const oth = D.assets.reduce((a, x) => a + (x.amount || 0) * (x.rate || 0) / 100, 0);
  return div + oth;
}
// 加權年報酬率
function blendedReturn() {
  const tot = liquidAsset();
  if (!tot) return 5;
  let w = 0;
  D.stocks.forEach(s => { w += stockValue(s) * 7; });          // 股票估7%總報酬
  D.assets.forEach(x => { w += (x.amount || 0) * (x.rate || 0); });
  return w / tot;
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
