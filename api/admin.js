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
  const meta = await redis.get('data:meta');
  let dataStatus = '未上传';
  if (meta) {
    try { dataStatus = '已更新于 ' + JSON.parse(meta).updated; } catch (e) {}
  }

  const html = `<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="UTF-8">
<title>后台管理</title>
<style>
body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;background:#f8fafc;margin:24px;color:#1e293b}
h1{font-size:20px;color:#1e40af;margin-bottom:4px}
.subtitle{color:#64748b;font-size:13px;margin-bottom:20px}
.upload-box{background:white;padding:20px;border-radius:10px;box-shadow:0 1px 3px rgba(0,0,0,0.08);margin-bottom:20px}
.upload-box textarea{width:100%;height:200px;font-family:monospace;font-size:12px;border:1px solid #cbd5e1;border-radius:8px;padding:10px}
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
    const jsonData = XLSX.utils.sheet_to_json(firstSheet, {header: 1, range: 4});
    const headers = [
      '分类','子分类','代码','名称','货币','股价','25涨幅','YTD',
      'MKT_Cap_USD','TEV_USD','PE_25','PE_26','PE_27','PE_28',
      'EV_25','EV_26','EV_27','EV_28',
      'RevYoY_26','RevYoY_27','RevYoY_28',
      'EBITDA_Margin_25','EBITDA_Margin_26','EBITDA_Margin_27','EBITDA_Margin_28',
      'NP_Margin_25','NP_Margin_26','NP_Margin_27','NP_Margin_28'
    ];
    const rows = jsonData.map(row => {
      return [
        row[1]||'', row[2]||'', row[3]||'', row[4]||'', row[5]||'', row[6]||'', row[7]||'', row[8]||'',
        row[10]||'', row[12]||'',
        row[16]||'', row[17]||'', row[18]||'', row[19]||'',
        row[22]||'', row[23]||'', row[24]||'', row[25]||'',
        row[30]||'', row[31]||'', row[32]||'',
        row[36]||'', row[37]||'', row[38]||'', row[39]||'',
        row[43]||'', row[44]||'', row[45]||'', row[46]||''
      ].join('\\t');
    }).filter(r => r.replace(/\\t/g,'') !== '');
    const csv = [headers.join('\\t'), ...rows].join('\\n');
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
