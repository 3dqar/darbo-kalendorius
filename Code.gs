/** Darbo Kalendorius v1 — Google Sheets-bound Apps Script. */
const SHEETS = {
  places: ['id','name','address','active','createdAt','updatedAt'],
  shifts: ['id','date','placeId','start','end','breakMinutes','createdAt','updatedAt'],
  months: ['month','normHours','grossRate','netRate','updatedAt']
};
const NIGHT_FROM = 22 * 60;
const NIGHT_TO = 6 * 60;
const TZ = 'Europe/Vilnius';

function doGet() {
  return HtmlService.createTemplateFromFile('Index').evaluate()
    .setTitle('Darbo kalendorius')
    .addMetaTag('viewport','width=device-width, initial-scale=1');
}
function include(filename) { return HtmlService.createHtmlOutputFromFile(filename).getContent(); }
function book_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('Susiekite Apps Script su Google Sheets dokumentu (Extensions → Apps Script).');
  return ss;
}
function ensure_() {
  const ss = book_();
  Object.keys(SHEETS).forEach(key => {
    let sh = ss.getSheetByName(key);
    if (!sh) { sh = ss.insertSheet(key); sh.getRange(1,1,sh.getMaxRows(),SHEETS[key].length).setNumberFormat('@'); }
    const headers = SHEETS[key];
    if (sh.getLastRow() === 0) { sh.appendRow(headers); sh.setFrozenRows(1); }
    else if (headers.join('|') !== sh.getRange(1,1,1,headers.length).getValues()[0].join('|')) {
      throw new Error('Netinkami lapo '+key+' stulpeliai. Patikrinkite antraštes.');
    }
  });
}
function records_(name) {
  const sh = book_().getSheetByName(name);
  if (!sh || sh.getLastRow() < 2) return [];
  const headers = SHEETS[name];
  return sh.getRange(2,1,sh.getLastRow()-1,headers.length).getValues().map(row => {
    const o={}; headers.forEach((k,i)=>o[k]=String(row[i] === null ? '' : row[i])); return o;
  });
}
function apiInit(month) {
  ensure_();
  validateMonth_(month);
  const places = records_('places').filter(p=>p.active!=='false');
  const months = records_('months');
  const settings = months.find(m=>m.month===month) || null;
  const shifts = records_('shifts').filter(s=>s.date.startsWith(month+'-'));
  return { places, settings, shifts: calculate_(shifts, places, settings), defaults: getDefaults_(months,month), month };
}
function getDefaults_(months, month) {
  const previous = months.filter(m=>m.month<month).sort((a,b)=>b.month.localeCompare(a.month))[0];
  return { grossRate:previous ? previous.grossRate : '', netRate:previous ? previous.netRate : '' };
}
function validateMonth_(m){ if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(m)) throw new Error('Neteisingas mėnesio formatas.'); }
function isDate_(s){ if(!/^\d{4}-\d{2}-\d{2}$/.test(s))return false; const d=new Date(s+'T12:00:00Z');return !isNaN(d.getTime()) && d.toISOString().slice(0,10)===s; }
function isTime_(s){return /^([01]\d|2[0-3]):[0-5]\d$/.test(s);}
function positive_(v,max){const n=Number(v); if(!Number.isFinite(n)||n<0||n>max)throw new Error('Neteisingas skaičius.');return n;}
function withLock_(fn){const lock=LockService.getDocumentLock()||LockService.getScriptLock();lock.waitLock(20000);try{ensure_();return fn();}finally{lock.releaseLock();}}
function addRow_(name, values){book_().getSheetByName(name).appendRow(values);}
function updateRow_(name,id,values){const sh=book_().getSheetByName(name); const rows=records_(name); const n=rows.findIndex(r=>r.id===id || (name==='months'&&r.month===id));if(n<0)throw new Error('Įrašas nerastas.');sh.getRange(n+2,1,1,values.length).setValues([values]);}
function apiSavePlace(payload){return withLock_(()=>{
  const name=String(payload.name||'').trim();const address=String(payload.address||'').trim();
  if(name.length<2||name.length>80||address.length>180)throw new Error('Patikrinkite darbo vietos pavadinimą ir adresą.');
  const all=records_('places');
  if(all.some(p=>p.active!=='false'&&p.name.toLocaleLowerCase('lt')===name.toLocaleLowerCase('lt')&&p.id!==payload.id)) throw new Error('Darbo vieta tokiu pavadinimu jau yra.');
  const now=new Date().toISOString();
  if(payload.id){const old=all.find(p=>p.id===payload.id);if(!old)throw new Error('Darbo vieta nerasta.'); updateRow_('places',old.id,[old.id,name,address,'true',old.createdAt,now]);return {id:old.id,name,address,active:'true'};}
  const id=Utilities.getUuid();addRow_('places',[id,name,address,'true',now,now]);return {id,name,address,active:'true'};
});}
function apiSaveMonth(payload){return withLock_(()=>{
  const month=String(payload.month||'');validateMonth_(month);
  const norm=positive_(payload.normHours,744), gross=positive_(payload.grossRate,100000), net=positive_(payload.netRate,100000);
  if(norm<=0||gross<=0||net<=0)throw new Error('Įrašykite teigiamą normą ir abu tarifus.');
  const existing=records_('months').find(r=>r.month===month);
  const values=[month,norm,gross,net,new Date().toISOString()];
  if(existing)updateRow_('months',month,values);else addRow_('months',values);
  return apiInit(month);
});}
function apiSaveShift(payload){return withLock_(()=>{
  const date=String(payload.date||''),placeId=String(payload.placeId||''),start=String(payload.start||''),end=String(payload.end||'');
  if(!isDate_(date)||!isTime_(start)||!isTime_(end))throw new Error('Neteisinga data arba laikas.');
  if(!records_('places').some(p=>p.id===placeId&&p.active!=='false'))throw new Error('Pasirinkite išsaugotą darbo vietą.');
  const breakMinutes=positive_(payload.breakMinutes,1439);
  const duration=(minutes_(end)-minutes_(start)+1440)%1440;
  if(duration===0||breakMinutes>=duration)throw new Error('Pamaina turi turėti teigiamą apmokamą trukmę (iki 24 val.).');
  const now=new Date().toISOString(),all=records_('shifts');
  if(payload.id){const old=all.find(s=>s.id===payload.id);if(!old)throw new Error('Pamaina nerasta.');updateRow_('shifts',old.id,[old.id,date,placeId,start,end,breakMinutes,old.createdAt,now]);}
  else addRow_('shifts',[Utilities.getUuid(),date,placeId,start,end,breakMinutes,now,now]);
  return apiInit(date.slice(0,7));
});}
function apiDeleteShift(id,month){return withLock_(()=>{
  validateMonth_(month);
  const sh=book_().getSheetByName('shifts'),rows=records_('shifts');const i=rows.findIndex(s=>s.id===id&&s.date.startsWith(month+'-'));
  if(i<0)throw new Error('Pamaina nerasta.');sh.deleteRow(i+2);return apiInit(month);
});}
function minutes_(s){return Number(s.slice(0,2))*60+Number(s.slice(3));}
function money_(n){return Math.round((n+Number.EPSILON)*100)/100;}
function calculate_(raw,places,setting){
  const norm=setting?Number(setting.normHours)*60:0;
  const gross=setting?Number(setting.grossRate):0,net=setting?Number(setting.netRate):0;
  let totalPaid=0,day=0,night=0,otDay=0,otNight=0,totalGross=0,totalNet=0;
  const items=raw.slice().sort((a,b)=>a.date.localeCompare(b.date)||a.start.localeCompare(b.start)||a.id.localeCompare(b.id)).map(s=>{
    const from=minutes_(s.start),to=minutes_(s.end);const duration=(to-from+1440)%1440;
    const br=Number(s.breakMinutes);const paidFraction=(duration-br)/duration;
    let d=0,n=0,od=0,on=0;
    // A paid fraction of each minute is assumed (proportional break allocation).
    // Actual break clock times are unknown, so night/day split is an estimate.
    for(let i=0;i<duration;i++){
      const clock=(from+i)%1440;const isNight=clock>=NIGHT_FROM||clock<NIGHT_TO;
      const paid=paidFraction;const regular=setting?Math.max(0,Math.min(paid,norm-totalPaid)):paid;
      const overtime=setting?paid-regular:0;
      if(isNight){n+=regular;on+=overtime;}else{d+=regular;od+=overtime;}
      totalPaid+=paid;
    }
    const earnedGross=(d*1+n*1.5+od*1.5+on*2)*gross/60;
    const earnedNet=(d*1+n*1.5+od*1.5+on*2)*net/60;
    day+=d;night+=n;otDay+=od;otNight+=on;totalGross+=earnedGross;totalNet+=earnedNet;
    return {...s,placeName:(places.find(p=>p.id===s.placeId)||{}).name||'Nežinoma',workedHours:money_((duration-br)/60),regularDayHours:money_(d/60),regularNightHours:money_(n/60),overtimeDayHours:money_(od/60),overtimeNightHours:money_(on/60),gross:money_(earnedGross),net:money_(earnedNet)};
  });
  return { items, totals:{workedHours:money_(totalPaid/60),regularDayHours:money_(day/60),regularNightHours:money_(night/60),overtimeDayHours:money_(otDay/60),overtimeNightHours:money_(on/60),overtimeHours:money_((otDay+otNight)/60),gross:money_(totalGross),net:money_(totalNet),normHours:setting?Number(setting.normHours):null,remainingHours:setting?money_(Math.max(0,norm-totalPaid)/60):null} };
}