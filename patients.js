
/* DentiCash v4 patient records module; works with the existing DentiCash v3 data model */
if(!Array.isArray(S.patients)) S.patients=[];
if(!Array.isArray(S.visits)) S.visits=[];
if(!Array.isArray(S.patientPhotos)) S.patientPhotos=[];
save();
let activePatientId=null, selectedTeeth=[];
const originalRender=render;
render=function(){if(!Array.isArray(S.patients))S.patients=[];if(!Array.isArray(S.visits))S.visits=[];originalRender();renderPatients();};
const originalIncomeModal=incomeModal;
incomeModal=function(edit){
  originalIncomeModal(edit);
  const r=edit?S.records.find(x=>x.id===edit):null;
  const box=document.getElementById('treatmentFields');
  if(!box)return;
  const wrap=document.createElement('div');
  wrap.innerHTML='<label>اتصال به پرونده بیمار</label><select id="linkedPatient"><option value="">بدون اتصال به پرونده</option>'+S.patients.map(p=>`<option value="${p.id}" ${p.id===(r?.patientId||'')?'selected':''}>${escapeHtml(p.code)} — ${escapeHtml(p.name)}</option>`).join('')+'</select>';
  box.parentNode.insertBefore(wrap,box);
};
const originalSaveIncome=saveIncome;
saveIncome=function(id){
  const linked=document.getElementById('linkedPatient')?.value||'';
  const before=new Set(S.records.map(x=>x.id));
  originalSaveIncome(id);
  const rec=id?S.records.find(x=>x.id===id):S.records.find(x=>!before.has(x.id));
  if(rec){rec.patientId=linked;const p=S.patients.find(x=>x.id===linked);if(p){rec.patientName=p.name;}save();renderPatients();income();}
};
function patientModal(editId){
 const p=S.patients.find(x=>x.id===editId)||{code:'',name:'',phone:'',birthDate:'',notes:''};
 open(`<button class="close" onclick="closeModal()">×</button><h2>${editId?'ویرایش پرونده':'پرونده بیمار جدید'}</h2>
 <label>کد پرونده کاغذی (الزامی و یکتا)</label><input id="pcCode" value="${escapeHtml(p.code)}" placeholder="مثلاً 1024">
 <label>نام بیمار</label><input id="pcName" value="${escapeHtml(p.name)}" placeholder="نام و نام خانوادگی">
 <label>شماره تماس (اختیاری)</label><input id="pcPhone" inputmode="tel" value="${escapeHtml(p.phone||'')}">
 <label>تاریخ تولد (اختیاری)</label><input id="pcBirth" type="date" value="${escapeHtml(p.birthDate||'')}">
 <label>یادداشت / سابقه پزشکی</label><textarea id="pcNotes" rows="3" style="width:100%;padding:10px;border:1px solid #cbd5e1;border-radius:10px">${escapeHtml(p.notes||'')}</textarea>
 <button class="primary" onclick="savePatient('${editId||''}')">ذخیره پرونده</button>`);
}
function savePatient(id){
 const code=document.getElementById('pcCode').value.trim(),name=document.getElementById('pcName').value.trim();
 if(!code||!name)return alert('کد پرونده و نام بیمار الزامی است.');
 if(S.patients.some(p=>p.code.toLowerCase()===code.toLowerCase()&&p.id!==id))return alert('این کد پرونده قبلاً ثبت شده است.');
 const old=S.patients.find(p=>p.id===id);
 const p={...(old||{id:uid(),createdAt:new Date().toISOString(),photos:[]}),code,name,phone:document.getElementById('pcPhone').value.trim(),birthDate:document.getElementById('pcBirth').value,notes:document.getElementById('pcNotes').value.trim(),updatedAt:new Date().toISOString()};
 if(id)S.patients[S.patients.findIndex(x=>x.id===id)]=p;else S.patients.unshift(p);
 save();closeModal();renderPatients();if(activePatientId===p.id)showPatient(p.id);
}
function renderPatients(){
 const list=document.getElementById('patientsList');if(!list)return;
 const q=(document.getElementById('patientSearch')?.value||'').trim().toLowerCase();
 const ps=S.patients.filter(p=>(p.name||'').toLowerCase().includes(q)||(p.code||'').toLowerCase().includes(q)||(p.phone||'').includes(q));
 list.innerHTML=ps.length?ps.map(p=>`<div class="patient-card"><div class="patient-head"><div><span class="patient-code">${escapeHtml(p.code)}</span> <b>${escapeHtml(p.name)}</b><small style="display:block;color:#64748b;margin-top:5px">${p.phone?escapeHtml(p.phone)+' • ':''} ${fa(S.visits.filter(v=>v.patientId===p.id).length)} اقدام ثبت‌شده</small></div><button class="primary" onclick="showPatient('${p.id}')">بازکردن پرونده</button></div></div>`).join(''):'<div class="patient-list-empty">پرونده‌ای پیدا نشد. برای شروع «بیمار جدید» را انتخاب کن.</div>';
}
function showPatient(id){
 const p=S.patients.find(x=>x.id===id);if(!p)return;activePatientId=id;
 document.getElementById('patientDetail').innerHTML=`<div class="panel">
 <div class="patient-head"><div><span class="patient-code">${escapeHtml(p.code)}</span><h2 style="margin-top:8px">${escapeHtml(p.name)}</h2><small>${p.phone?escapeHtml(p.phone):'بدون شماره تماس'}${p.birthDate?' • تولد: '+escapeHtml(p.birthDate):''}</small></div><div class="patient-actions"><button onclick="patientModal('${p.id}')">ویرایش مشخصات</button><button class="primary" onclick="visitModal('${p.id}')">＋ ثبت درمان</button><button onclick="patientIncome('${p.id}')">＋ ثبت دریافتی</button></div></div>
 <div class="patient-detail-grid"><div class="panel"><h2>یادداشت پرونده</h2><p>${escapeHtml(p.notes||'یادداشتی ثبت نشده است.')}</p></div><div class="panel"><h2>خلاصه حساب</h2><p>جمع دریافتی ثبت‌شده: <b>${money(sum(S.records.filter(r=>r.patientId===p.id)))}</b></p><p>تعداد پرداخت/دریافتی: ${fa(S.records.filter(r=>r.patientId===p.id).length)}</p></div></div>
 <div class="panel"><div class="between"><h2>چارت دندانی</h2><small>برای انتخاب دندان لمس کن</small></div>${toothChart(p.id)}<div id="toothHistory"></div></div>
 <div class="panel"><div class="between"><h2>تاریخچه درمان‌ها</h2><button onclick="visitModal('${p.id}')">＋ اقدام جدید</button></div>${patientVisits(p.id)}</div>
 <div class="panel"><div class="between"><h2>تصاویر و رادیوگرافی</h2><label class="secondary">＋ افزودن تصویر<input type="file" accept="image/*" multiple hidden onchange="addPatientPhotos('${p.id}',this.files)"></label></div><p>تصاویر به این پرونده متصل می‌شوند. برای صرفه‌جویی در فضا، تصویرها فشرده می‌شوند.</p><div class="photo-grid">${patientPhotos(p.id)}</div></div>
 <div class="panel"><h2>سوابق مالی بیمار</h2>${patientLedger(p.id)}</div>
 </div>`;
 document.getElementById('toothHistory').innerHTML='';switchView('patients');
}
function switchView(v){document.querySelectorAll('.view').forEach(x=>x.classList.toggle('active',x.id===v));document.querySelectorAll('nav button').forEach(x=>x.classList.toggle('active',x.dataset.v===v));}
function toothChart(pid){
 const upper=[18,17,16,15,14,13,12,11,21,22,23,24,25,26,27,28],lower=[48,47,46,45,44,43,42,41,31,32,33,34,35,36,37,38];
 const p=S.patients.find(x=>x.id===pid),treated=new Set(S.visits.filter(v=>v.patientId===pid).flatMap(v=>v.teeth||[]));
 const btn=n=>`<button class="tooth ${treated.has(n)?'has-treatment':''}" onclick="toothHistoryFor('${pid}',${n})" title="دندان ${n}">${n}</button>`;
 return `<div class="tooth-row-label">فک بالا • راست به چپ در نمایش فارسی</div><div class="tooth-chart">${upper.map(btn).join('')}</div><div class="tooth-row-label">فک پایین</div><div class="tooth-chart">${lower.map(btn).join('')}</div><small>بنفش: برای این دندان سابقه درمان ثبت شده است. برای دیدن تاریخچه روی شماره دندان بزن.</small>`;
}
function toothHistoryFor(pid,n){
 const p=S.patients.find(x=>x.id===pid),vs=S.visits.filter(v=>v.patientId===pid&&(v.teeth||[]).includes(n)).sort((a,b)=>(b.date||'').localeCompare(a.date||''));
 const el=document.getElementById('toothHistory');if(el)el.innerHTML=`<div class="panel"><h2>دندان ${n}</h2>${vs.length?vs.map(v=>`<div class="record"><div><b>${escapeHtml(v.procedure)}</b><small>${fmt(v.date)} • ${escapeHtml(v.note||'بدون شرح')}</small></div></div>`).join(''):'برای این دندان درمانی ثبت نشده است.'}<button onclick="visitModal('${pid}',${n})">＋ ثبت درمان برای دندان ${n}</button></div>`;
}
function patientVisits(pid){
 const vs=S.visits.filter(v=>v.patientId===pid).sort((a,b)=>(b.date||'').localeCompare(a.date||''));
 return vs.length?vs.map(v=>`<div class="record"><div><b>${escapeHtml(v.procedure)}</b><small>${fmt(v.date)} • دندان: ${(v.teeth||[]).join('، ')||'ثبت نشده'}${v.note?' • '+escapeHtml(v.note):''}</small></div><button onclick="deleteVisit('${v.id}','${pid}')">حذف</button></div>`).join(''):'<p>هنوز درمانی در این پرونده ثبت نشده است.</p>';
}
function visitModal(pid,tooth){
 selectedTeeth=tooth?[tooth]:[];
 const options=S.treatments.filter(t=>t.active).map(t=>`<option>${escapeHtml(t.name)}</option>`).join('');
 open(`<button class="close" onclick="closeModal()">×</button><h2>ثبت اقدام درمانی</h2><label>تاریخ</label><input id="visitDate" type="date" value="${new Date().toISOString().slice(0,10)}"><label>نوع درمان</label><input id="visitProcedure" list="procedureList" placeholder="مثلاً اندو، ترمیم، روکش"><datalist id="procedureList">${options}</datalist><label>دندان‌ها (شماره‌ها را با لمس انتخاب کن)</label><div class="tooth-chart">${[18,17,16,15,14,13,12,11,21,22,23,24,25,26,27,28,48,47,46,45,44,43,42,41,31,32,33,34,35,36,37,38].map(n=>`<button type="button" class="tooth ${selectedTeeth.includes(n)?'selected':''}" onclick="toggleVisitTooth(${n},this)">${n}</button>`).join('')}</div><label>شرح درمان / یادداشت</label><textarea id="visitNote" rows="3" style="width:100%;padding:10px;border:1px solid #cbd5e1;border-radius:10px"></textarea><label>وضعیت</label><select id="visitStatus"><option value="completed">انجام‌شده</option><option value="planned">پیشنهادی / باقی‌مانده</option><option value="followup">نیازمند پیگیری</option></select><button class="primary" onclick="saveVisit('${pid}')">ذخیره درمان</button>`);
}
function toggleVisitTooth(n,el){if(selectedTeeth.includes(n))selectedTeeth=selectedTeeth.filter(x=>x!==n);else selectedTeeth.push(n);el.classList.toggle('selected',selectedTeeth.includes(n));}
function saveVisit(pid){
 const procedure=document.getElementById('visitProcedure').value.trim(),date=document.getElementById('visitDate').value;
 if(!procedure||!date)return alert('نوع درمان و تاریخ الزامی است.');
 S.visits.push({id:uid(),patientId:pid,date,procedure,teeth:[...selectedTeeth].sort((a,b)=>a-b),note:document.getElementById('visitNote').value.trim(),status:document.getElementById('visitStatus').value,createdAt:new Date().toISOString()});
 save();closeModal();showPatient(pid);renderPatients();
}
function deleteVisit(id,pid){if(!confirm('این اقدام از تاریخچه حذف شود؟'))return;S.visits=S.visits.filter(v=>v.id!==id);save();showPatient(pid);}
function patientIncome(pid){const p=S.patients.find(x=>x.id===pid);if(!p)return;incomeModal();const sel=document.getElementById('linkedPatient');if(sel)sel.value=pid;const nm=document.getElementById('patientName');if(nm)nm.value=p.name;switchView('income');}
function patientLedger(pid){
 const rows=S.records.filter(r=>r.patientId===pid).sort((a,b)=>(b.date||'').localeCompare(a.date||''));
 return rows.length?`<div class="table-wrap"><table><tr><th>تاریخ</th><th>شرح</th><th>دریافتی</th></tr>${rows.map(r=>`<tr><td>${fmt(r.date)}</td><td>${(r.items||[]).map(x=>{const t=S.treatments.find(z=>z.id===x.treatmentId);return escapeHtml(t?.name||'درمان')+' × '+fa(x.qty)}).join('، ')||escapeHtml(r.note||'دریافتی')}</td><td>${money(r.received)}</td></tr>`).join('')}</table></div>`:'<p>هنوز دریافتی به این پرونده متصل نشده است.</p>';
}
function patientPhotos(pid){
 const p=S.patients.find(x=>x.id===pid);if(!p)return '';
 return (p.photos||[]).map(ph=>`<div class="patient-photo-item"><img class="patient-photo" src="${ph.data}" alt="${escapeHtml(ph.name)}"><small>${escapeHtml(ph.name)}</small><button onclick="deletePatientPhoto('${pid}','${ph.id}')">حذف تصویر</button></div>`).join('');
}
async function addPatientPhotos(pid,files){
 const p=S.patients.find(x=>x.id===pid);if(!p)return;if(!p.photos)p.photos=[];
 for(const file of Array.from(files||[])){
  if(!file.type.startsWith('image/'))continue;
  try{
   const data=await compressImage(file);
   p.photos.push({id:uid(),name:file.name,date:new Date().toISOString(),data});
  }catch(e){alert('پردازش یکی از تصاویر ناموفق بود.');}
 }
 save();showPatient(pid);
}
function compressImage(file){
 return new Promise((resolve,reject)=>{
  const reader=new FileReader();reader.onerror=reject;reader.onload=()=>{
   const img=new Image();img.onerror=reject;img.onload=()=>{
    const max=1400,scale=Math.min(1,max/Math.max(img.width,img.height)),canvas=document.createElement('canvas');
    canvas.width=Math.max(1,Math.round(img.width*scale));canvas.height=Math.max(1,Math.round(img.height*scale));
    canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);resolve(canvas.toDataURL('image/jpeg',0.78));
   };img.src=reader.result;
  };reader.readAsDataURL(file);
 });
}
function deletePatientPhoto(pid,photoId){if(!confirm('این تصویر حذف شود؟'))return;const p=S.patients.find(x=>x.id===pid);p.photos=(p.photos||[]).filter(x=>x.id!==photoId);save();showPatient(pid);}
