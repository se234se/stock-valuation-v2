import { getRedis } from './_redis.js';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'VALUE2027';

function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h) + str.charCodeAt(i);
    h |= 0;
  }
  return h;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).send('Method not allowed');

  const pwd = req.query.pwd || '';
  if (hash(pwd) !== hash(ADMIN_PASSWORD)) {
    return res.status(401).send('Unauthorized');
  }

  const redis = await getRedis();
  const allLogs = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = `logs:${d.toISOString().slice(0, 10)}`;
    const logs = await redis.lRange(key, 0, -1);
    logs.forEach(l => {
      try {
        const entry = JSON.parse(l);
        entry.date = d.toISOString().slice(0, 10);
        allLogs.push(entry);
      } catch (e) {}
    });
  }

  const stats = {
    total: allLogs.length,
    uniqueIPs: new Set(allLogs.map(l => l.ip)).size,
    byCountry: {},
    byDevice: {},
    byDay: {},
    recent: allLogs.slice(0, 50),
  };
  allLogs.forEach(l => {
    stats.byCountry[l.country] = (stats.byCountry[l.country] || 0) + 1;
    stats.byDevice[l.device] = (stats.byDevice[l.device] || 0) + 1;
    stats.byDay[l.date] = (stats.byDay[l.date] || 0) + 1;
  });

  const meta = await redis.get('data:meta');
  let dataStatus = '未上传';
  if (meta) {
    try { dataStatus = '已更新于 ' + JSON.parse(meta).updated; } catch (e) {}
  }

  const rows = stats.recent.map(l => `
    <tr><td>${l.timestamp}</td><td>${l.ip}</td><td>${l.country}</td><td>${l.device}</td>
    <td>${l.screen}</td><td>${l.lang}</td></tr>`).join('');
  const countryRows = Object.entries(stats.byCountry).sort((a, b) => b[1] - a[1])
    .map(([c, n]) => `<tr><td>${c}</td><td>${n}</td></tr>`).join('');
  const deviceRows = Object.entries(stats.byDevice).sort((a, b) => b[1] - a[1])
    .map(([d, n]) => `<tr><td>${d}</td><td>${n}</td></tr>`).join('');
  const dayRows = Object.entries(stats.byDay).sort()
    .map(([d, n]) => `<tr><td>${d}</td><td>${n}</td></tr>`).join('');

  const html = `<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="UTF-8">
<title>后台管理</title>
<style>
body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;background:#f8fafc;margin:24px;color:#1e293b}
h1{font-size:20px;color:#1e40af;margin-bottom:4px}
.subtitle{color:#64748b;font-size:13px;margin-bottom:20px}
.cards{display:flex;gap:16px;margin-bottom:20px;flex-wrap:wrap}
.card{background:white;padding:16px 20px;border-radius:10px;box-shadow:0 1px 3px rgba(0,0,0,0.08);min-width:140px}
.card .label{font-size:12px;color:#64748b}
.card .value{font-size:24px;font-weight:700;color:#1e40af;margin-top:4px}
table{width:100%;border-collapse:collapse;background:white;border-radius:10px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);font-size:13px}
th{background:#f1f5f9;padding:10px 12px;text-align:left;font-weight:600;color:#475569;border-bottom:1px solid #e2e8f0}
td{padding:8px 12px;border-bottom:1px solid #f1f5f9}
tr:hover{background:#f8fafc}
.section{margin-bottom:24px}
.section h2{font-size:14px;color:#475569;margin-bottom:8px;font-weight:600}
.grid{display:grid;grid-template-columns:2fr 1fr 1fr;gap:16px}
@media(max-width:768px){.grid{grid-template-columns:1fr}}
.upload-box{background:white;padding:20px;border-radius:10px;box-shadow:0 1px 3px rgba(0,0,0,0.08);margin-bottom:20px}
.upload-box input[type=file]{margin-bottom:10px;font-size:13px}
.upload-box textarea{width:100%;height:120px;font-family:monospace;font-size:12px;border:1px solid #cbd5e1;border-radius:8px;padding:10px}
.upload-box button{background:#3b82f6;color:white;border:none;padding:10px 20px;border-radius:8px;cursor:pointer;margin-top:10px}
.status{margin-top:10px;font-size:13px;color:#16a34a}
</style></head>
<body>
<h1>后台管理</h1>
<div class="subtitle">AI Supply Chain Comp · 数据状态: ${dataStatus}</div>
<div class="upload-box">
  <h2>更新数据</h2>
  <p style="font-size:13px;color:#64748b;margin-bottom:10px">选择 Excel 文件（.xlsx）或粘贴 CSV 内容</p>
  <input type="file" id="fileInput" accept=".xlsx" onchange="handleFile(this)"><br>
  <textarea id="csvData" placeholder="或在这里粘贴 data.csv 内容..."></textarea><br>
  <button onclick="uploadData()">上传更新</button>
  <div class="status" id="uploadStatus"></div>
</div>
<div class="cards">
  <div class="card"><div class="label">总访问量</div><div class="value">${stats.total}</div></div>
  <div class="card"><div class="label">独立访客</div><div class="value">${stats.uniqueIPs}</div></div>
  <div class="card"><div class="label">今日</div><div class="value">${stats.byDay[new Date().toISOString().slice(0,10)]||0}</div></div>
</div>
<div class="grid">
  <div class="section">
    <h2>最近访问</h2>
    <table><thead><tr><th>时间</th><th>IP</th><th>地区</th><th>设备</th><th>屏幕</th><th>语言</th></tr></thead>
    <tbody>${rows}</tbody></table>
  </div>
  <div>
    <div class="section"><h2>地区</h2><table><thead><tr><th>地区</th><th>次数</th></tr></thead><tbody>${countryRows}</tbody></table></div>
    <div class="section"><h2>设备</h2><table><thead><tr><th>设备</th><th>次数</th></tr></thead><tbody>${deviceRows}</tbody></table></div>
    <div class="section"><h2>日期</h2><table><thead><tr><th>日期</th><th>次数</th></tr></thead><tbody>${dayRows}</tbody></table></div>
  </div>
</div>
<script src="https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js"></script>
<script>
function handleFile(input){
  const file = input.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = function(e){
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, {type: 'array'});
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const csv = XLSX.utils.sheet_to_csv(firstSheet, {FS: "\t"});
    document.getElementById('csvData').value = csv;
    uploadData();
  };
  reader.readAsArrayBuffer(file);
}
async function uploadData(){
  const text = document.getElementById('csvData').value;
  if(!text){alert('内容为空');return;}
  const pwd = prompt('请输入管理密码');
  if(!pwd) return;
  const res = await fetch('/api/update?pwd='+encodeURIComponent(pwd),{
    method:'POST',body:text,headers:{'Content-Type':'text/plain'}
  });
  const data = await res.json();
  document.getElementById('uploadStatus').textContent = data.ok ? '上传成功' : '失败: '+data.error;
  if(data.ok) setTimeout(()=>location.reload(),1000);
}
</script>
</body></html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.status(200).send(html);
}
