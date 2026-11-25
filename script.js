const MONTHS=["leden","únor","březen","duben","květen","červen","červenec","srpen","září","říjen","listopad","prosinec"];
const ACCENT=["#4a7fb0","#8a6fb0","#5f9a52","#c9a227","#d1628a","#2f9a95","#d0662a","#c8641e","#2a8f8f","#b3342b","#8c6a4a","#3f6f9a"];
const TAG=["Zimní chlad.","Pomalu do tempa.","Jaro se probouzí.","Nový začátek.","Plná forma.","Léto přichází.","Žár a klid.","Práce ze země.","Zlatý podzim.","Podzimní tempo.","Zpomalení.","Klid na závěr."];
const TYPY=["Práce ze země / lehká","Skokovka","Závody","Regenerace","Laser"];
const TYP_SECTION={"Práce ze země / lehká":"Lehká práce","Skokovka":"Skokovka","Závody":"Skokovka","Regenerace":"Regenerace","Laser":"Laser"};
const SECTIONS=["Lehká práce","Skokovka","Regenerace","Laser"];
const LOADS=["Regenerace","Lehká","Střední","Vysoká"];
const LOAD_COLOR={"Regenerace":"var(--c-reg)","Lehká":"var(--c-leh)","Střední":"var(--c-str)","Vysoká":"var(--c-vys)"};
const BIRTH=new Date(2007,3,2);

const pad=n=>String(n).padStart(2,"0");
const key=(y,m,d)=>`${y}-${pad(m+1)}-${pad(d)}`;
const dim=(y,m)=>new Date(y,m+1,0).getDate();
let today=new Date();
let view={y:today.getFullYear(),m:today.getMonth()};
let sel=key(today.getFullYear(),today.getMonth(),today.getDate());
let days={};           // key -> {typ,load,note}
let draft={typ:null,load:null};
let store=null;        // db collection or null

/* ---------- persistence ---------- */
async function initStore(){
  try{
    const db=await claude.use("db"), user=await claude.use("user");
    if(db&&user){
      const id=await user.id();
      store=db.collection("data/users/"+id+"/days");
      await new Promise(res=>{
        const t=setTimeout(res,10000);
        store.onSnapshot(snap=>{
          clearTimeout(t);
          const o={};
          snap.forEach(d=>{o[d.id]=d.data();});
          days=o; render(); res();
        },()=>{clearTimeout(t);res();});
      });
      return;
    }
  }catch(e){}
  try{days=JSON.parse(localStorage.getItem("pm-days")||"{}");}catch(e){days={};}
  setStatus("Data se ukládají jen v tomto prohlížeči.");
  render();
}
async function putDay(k,v){
  days[k]=v;
  if(store){try{await store.doc(k).set(v);}catch(e){setStatus("Uložení se nepovedlo, zkuste to znovu.");}}
  else try{localStorage.setItem("pm-days",JSON.stringify(days));}catch(e){}
}
async function delDay(k){
  delete days[k];
  if(store){try{await store.doc(k).delete();}catch(e){}}
  else try{localStorage.setItem("pm-days",JSON.stringify(days));}catch(e){}
}
function setStatus(t){document.getElementById("status").textContent=t;}

/* ---------- helpers ---------- */
function monthDays(y,m){
  const out=[];
  for(let d=1;d<=dim(y,m);d++){const k=key(y,m,d);out.push({k,d,v:days[k]||null});}
  return out;
}
function countMonth(y,m){
  const c={sections:{},loads:{},logged:0,total:dim(y,m)};
  SECTIONS.forEach(s=>c.sections[s]=0); LOADS.forEach(l=>c.loads[l]=0);
  monthDays(y,m).forEach(({v})=>{
    if(!v)return; c.logged++;
    c.sections[TYP_SECTION[v.typ]]++;
    if(v.load)c.loads[v.load]++;
  });
  return c;
}

/* ---------- render ---------- */
function render(){
  document.documentElement.style.setProperty("--accent",ACCENT[view.m]);
  document.getElementById("title").innerHTML=`${MONTHS[view.m]} ${view.y}<em>${TAG[view.m]}</em>`;
  renderMeta(); renderCal(); renderForm(); renderStats(); renderAlerts(); renderYear();
}
function renderMeta(){
  let a=today.getFullYear()-BIRTH.getFullYear();
  if(today<new Date(today.getFullYear(),3,2))a--;
  document.getElementById("meta").textContent=`Kůň, nar. 2. 4. 2007 · ${a} let · záznamy od února 2026`;
}
function renderCal(){
  const el=document.getElementById("cal"); el.innerHTML="";
  ["Po","Út","St","Čt","Pá","So","Ne"].forEach(n=>{const d=document.createElement("div");d.className="dow";d.textContent=n;el.appendChild(d);});
  const first=(new Date(view.y,view.m,1).getDay()+6)%7;
  for(let i=0;i<first;i++){const e=document.createElement("div");e.className="day empty";el.appendChild(e);}
  const tk=key(today.getFullYear(),today.getMonth(),today.getDate());
  monthDays(view.y,view.m).forEach(({k,d,v})=>{
    const b=document.createElement("button");
    b.type="button"; b.className="day"+(k===sel?" sel":"")+(k===tk?" today":"");
    if(v&&v.load)b.dataset.load=v.load;
    const n=document.createElement("span");n.className="n";n.textContent=d;
    const t=document.createElement("span");t.className="t";t.textContent=v?v.typ.replace("Práce ze země / lehká","Lehká"):"";
    b.append(n,t);
    b.setAttribute("aria-label",`${d}. ${MONTHS[view.m]}${v?", "+v.typ+", "+(v.load||""):""}`);
    b.onclick=()=>{sel=k;render();};
    el.appendChild(b);
  });
}
function seg(id,items,cur,onPick){
  const el=document.getElementById(id);el.innerHTML="";
  items.forEach(x=>{
    const b=document.createElement("button");b.type="button";b.textContent=x;
    b.setAttribute("aria-pressed",String(cur===x));
    b.onclick=()=>onPick(x);el.appendChild(b);
  });
}
function renderForm(){
  const [y,m,d]=sel.split("-").map(Number);
  document.getElementById("formTitle").textContent=`${d}. ${m}. ${y}`;
  const v=days[sel];
  draft={typ:v?v.typ:draft.typ&&draft.k===sel?draft.typ:null,load:v?v.load:draft.load&&draft.k===sel?draft.load:null,k:sel};
  seg("typSeg",TYPY,draft.typ,x=>{draft.typ=x;draft.k=sel;
    if(x==="Regenerace"||x==="Laser")draft.load="Regenerace";
    if(x==="Závody"||x==="Skokovka"){if(!draft.load||draft.load==="Regenerace")draft.load="Vysoká";}
    renderFormControls();});
  renderFormControls(v);
}
function renderFormControls(v){
  seg("loadSeg",LOADS,draft.load,x=>{draft.load=x;draft.k=sel;renderFormControls();});
  seg("typSeg",TYPY,draft.typ,x=>{draft.typ=x;draft.k=sel;
    if(x==="Regenerace"||x==="Laser")draft.load="Regenerace";
    if(x==="Závody"||x==="Skokovka"){if(!draft.load||draft.load==="Regenerace")draft.load="Vysoká";}
    renderFormControls();});
  if(v!==undefined)document.getElementById("note").value=v?v.note||"":"";
}
function renderStats(){
  const c=countMonth(view.y,view.m);
  const el=document.getElementById("stats");el.innerHTML="";
  const labels={"Lehká práce":"dnů lehké práce","Skokovka":"dnů skokovky a závodů","Regenerace":"dnů regenerace","Laser":"laserových terapií"};
  SECTIONS.forEach(s=>{
    const d=document.createElement("div");d.className="stat";
    d.innerHTML=`<b>${c.sections[s]}</b><span>${labels[s]}</span>`;el.appendChild(d);
  });
  const sum=SECTIONS.reduce((a,s)=>a+c.sections[s],0);
  const ch=document.getElementById("check");
  if(sum===c.total){ch.className="check ok";ch.textContent=`${sum} z ${c.total} dnů, součet sedí.`;}
  else{ch.className="check bad";ch.textContent=`${sum} z ${c.total} dnů zapsáno, chybí ${c.total-sum}.`;}
  const bars=document.getElementById("bars");bars.innerHTML="";
  const denom=c.logged||1;
  LOADS.forEach(l=>{
    const p=Math.round(100*c.loads[l]/denom);
    const r=document.createElement("div");r.className="bar";
    r.innerHTML=`<span>${l}</span><div class="track"><div class="fill" style="width:${p}%;background:${LOAD_COLOR[l]}"></div></div><span class="pct">${p} %</span>`;
    bars.appendChild(r);
  });
}
function renderAlerts(){
  const el=document.getElementById("alerts");el.innerHTML="";
  const all=Object.keys(days).sort();
  const add=(t,good)=>{const d=document.createElement("div");d.className="alert"+(good?" good":"");d.textContent=t;el.appendChild(d);};
  // streak of Střední/Vysoká ending at latest logged day
  let streak=0,maxStreak=0,maxEnd="";
  let prev=null;
  all.forEach(k=>{
    const v=days[k];const hard=v.load==="Střední"||v.load==="Vysoká";
    const consecutive=prev&&((new Date(k)-new Date(prev))/864e5===1);
    if(hard){streak=consecutive&&streak>0?streak+1:1;}else streak=0;
    if(streak>maxStreak){maxStreak=streak;maxEnd=k;}
    prev=k;
  });
  if(streak>=3)add(`Poslední ${streak} zapsané dny po sobě byly se střední nebo vysokou zátěží. Zvažte regeneraci.`);
  else if(maxStreak>=3)add(`Nejdelší série náročných dní: ${maxStreak} (končí ${maxEnd.split("-").reverse().join(". ")}).`);
  // days since regeneration
  const lastReg=[...all].reverse().find(k=>days[k].load==="Regenerace");
  if(all.length&&lastReg){
    const gap=Math.round((new Date(all[all.length-1])-new Date(lastReg))/864e5);
    if(gap>=5)add(`Od poslední regenerace uběhlo ${gap} dní.`);
  }
  // week with no rest
  const wk={};
  all.forEach(k=>{const d=new Date(k);const t=new Date(d);t.setDate(d.getDate()-((d.getDay()+6)%7));const w=t.toISOString().slice(0,10);(wk[w]=wk[w]||[]).push(days[k]);});
  const noRest=Object.entries(wk).filter(([,a])=>a.length>=6&&!a.some(v=>v.load==="Regenerace")).map(([w])=>w);
  if(noRest.length)add(`Týdny bez jediného dne regenerace: ${noRest.length}. Poslední od ${noRest[noRest.length-1].split("-").reverse().join(". ")}.`);
  if(!el.children.length)add(all.length?"Nic nápadného, rozložení zátěže vypadá vyrovnaně.":"Po zapsání prvních dnů tu uvidíte série náročných dní a odpočinek.",true);
}
function renderYear(){
  document.getElementById("yearTitle").textContent=`Rok ${view.y}`;
  const el=document.getElementById("year");el.innerHTML="";
  for(let m=0;m<12;m++){
    const c=countMonth(view.y,m);
    const col=document.createElement("div");col.className="ycol"+(m===view.m?" cur":"");
    const st=document.createElement("div");st.className="stack";
    st.title=`${MONTHS[m]}: ${c.logged} z ${c.total} dnů`;
    LOADS.forEach(l=>{
      if(!c.loads[l])return;
      const s=document.createElement("div");s.style.height=(100*c.loads[l]/c.total)+"%";s.style.background=LOAD_COLOR[l];st.appendChild(s);
    });
    const sm=document.createElement("small");sm.textContent=MONTHS[m].slice(0,3);
    col.append(st,sm);col.onclick=()=>{view.m=m;sel=key(view.y,m,1);render();};
    el.appendChild(col);
  }
}

/* ---------- events ---------- */
document.getElementById("prev").onclick=()=>{view.m--;if(view.m<0){view.m=11;view.y--;}sel=key(view.y,view.m,1);render();};
document.getElementById("next").onclick=()=>{view.m++;if(view.m>11){view.m=0;view.y++;}sel=key(view.y,view.m,1);render();};
document.getElementById("todayBtn").onclick=()=>{view={y:today.getFullYear(),m:today.getMonth()};sel=key(view.y,view.m,today.getDate());render();};
document.getElementById("form").onsubmit=async e=>{
  e.preventDefault();
  if(!draft.typ||!draft.load){setStatus("Vyberte typ práce i zátěž.");return;}
  await putDay(sel,{typ:draft.typ,load:draft.load,note:document.getElementById("note").value.trim()});
  setStatus("Uloženo.");
  const [y,m,d]=sel.split("-").map(Number);
  if(d<dim(y,m-1)){sel=key(y,m-1,d+1);}
  render();
};
document.getElementById("clear").onclick=async()=>{
  if(!days[sel]){setStatus("Tento den nemá zápis.");return;}
  await delDay(sel);draft={typ:null,load:null};setStatus("Zápis smazán.");render();
};

/* ---------- import / export ---------- */
function toKey(v){
  if(v instanceof Date&&!isNaN(v))return key(v.getFullYear(),v.getMonth(),v.getDate());
  if(typeof v==="number"){const d=new Date(Math.round((v-25569)*864e5));return key(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate());}
  const m=String(v||"").match(/(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})/);
  return m?key(+m[3],+m[2]-1,+m[1]):null;
}
function mapRow(typRaw,loadRaw){
  const t=String(typRaw||"").toLowerCase(), l=String(loadRaw||"").toLowerCase();
  let typ="Práce ze země / lehká";
  if(t.includes("laser"))typ="Laser";
  else if(t.includes("závod")||t.includes("zavod"))typ="Závody";
  else if(t.includes("skok"))typ="Skokovka";
  else if(t.includes("regener")||t.includes("volno")||t.includes("pastv"))typ="Regenerace";
  let load="Lehká";
  if(l.includes("regener"))load="Regenerace";
  else if(l.includes("vys"))load="Vysoká";
  else if(l.includes("stř")||l.includes("str"))load="Střední";
  else if(l.includes("leh")||l.includes("lehk"))load="Lehká";
  else if(typ==="Regenerace"||typ==="Laser")load="Regenerace";
  else if(typ==="Skokovka"||typ==="Závody")load="Vysoká";
  return {typ,load};
}
document.getElementById("file").onchange=async ev=>{
  const f=ev.target.files[0];if(!f)return;
  const io=document.getElementById("ioStatus");
  try{
    const wb=XLSX.read(await f.arrayBuffer(),{type:"array",cellDates:true});
    let n=0;
    for(const name of wb.SheetNames){
      const rows=XLSX.utils.sheet_to_json(wb.Sheets[name],{defval:""});
      if(!rows.length)continue;
      const cols=Object.keys(rows[0]);
      const cD=cols.find(c=>/dat/i.test(c))||cols[0];
      const cT=cols.find(c=>/typ/i.test(c));
      const cL=cols.find(c=>/z[aá]t[eě][zž]/i.test(c));
      if(!cT&&!cL)continue;
      for(const r of rows){
        const k=toKey(r[cD]);if(!k)continue;
        const {typ,load}=mapRow(cT?r[cT]:"",cL?r[cL]:"");
        await putDay(k,{typ,load,note:""});n++;
      }
    }
    io.textContent=n?`Načteno ${n} dnů. Zkontrolujte kalendář, typy se přiřazují podle slov v buňkách.`:"Nenašel jsem sloupce Datum, Typ práce a Zátěž.";
    render();
  }catch(e){io.textContent="Soubor se nepodařilo přečíst.";}
};
document.getElementById("copyCsv").onclick=async()=>{
  const lines=["Datum;Typ práce;Zátěž;Poznámka"];
  Object.keys(days).sort().forEach(k=>{const v=days[k];lines.push([k.split("-").reverse().join("."),v.typ,v.load,(v.note||"").replace(/[;\n]/g," ")].join(";"));});
  const io=document.getElementById("ioStatus");
  try{await navigator.clipboard.writeText(lines.join("\n"));io.textContent="Zkopírováno do schránky.";}
  catch(e){io.textContent="Schránka není dostupná, zkuste to znovu kliknutím.";}
};

/* ---------- palette switcher ---------- */
const PALETTES=["default","cool","nature","sunset","ocean","lavender"];
const PALETTE_NAMES={"default":"Klasická","cool":"Chladná","nature":"Přírodní","sunset":"Západ slunce","ocean":"Oceán","lavender":"Levandule"};
let currentPalette="default";
function loadPalette(){
  try{currentPalette=localStorage.getItem("pm-palette")||"default";}catch(e){}
  if(currentPalette!=="default")document.documentElement.dataset.palette=currentPalette;
}
function cyclePalette(){
  const idx=PALETTES.indexOf(currentPalette);
  currentPalette=PALETTES[(idx+1)%PALETTES.length];
  if(currentPalette==="default")delete document.documentElement.dataset.palette;
  else document.documentElement.dataset.palette=currentPalette;
  try{localStorage.setItem("pm-palette",currentPalette);}catch(e){}
  setStatus(`Paleta: ${PALETTE_NAMES[currentPalette]}`);
  render();
}
document.getElementById("paletteBtn").onclick=cyclePalette;

/* ---------- filter system ---------- */
function initFilters(){
  const filterSection=document.getElementById("filterSection");
  if(!filterSection)return;

  filterSection.addEventListener("toggle",function(){
    if(filterSection.open){
      renderFilterControls();
    }
  });
}

function renderFilterControls(){
  // Build month checkboxes for all months with data
  const monthSet=new Set();
  Object.keys(days).forEach(k=>{
    const [y,m]=k.split("-");
    monthSet.add(`${y}-${m}`);
  });
  const sortedMonths=[...monthSet].sort().reverse();

  const monthFilters=document.getElementById("monthFilters");
  monthFilters.innerHTML="";
  sortedMonths.forEach(ym=>{
    const [y,m]=ym.split("-");
    const monthIdx=parseInt(m)-1;
    const label=document.createElement("label");
    label.className="month-checkbox";
    label.innerHTML=`<input type="checkbox" value="${ym}" checked> ${MONTHS[monthIdx]} ${y}`;
    monthFilters.appendChild(label);
  });

  // Type filters
  seg("typeFilters",TYPY,null,()=>{});

  // Load filters
  seg("loadFilters",LOADS,null,()=>{});
}

function applyFilters(){
  const selectedMonths=Array.from(document.querySelectorAll("#monthFilters input:checked")).map(el=>el.value);
  const selectedTypes=Array.from(document.querySelectorAll("#typeFilters button[aria-pressed='true']")).map(el=>el.textContent);
  const selectedLoads=Array.from(document.querySelectorAll("#loadFilters button[aria-pressed='true']")).map(el=>el.textContent);

  if(selectedMonths.length===0){
    document.getElementById("filterResults").innerHTML='<p class="hint">Vyberte alespoň jeden měsíc.</p>';
    return;
  }

  // Filter days
  const filtered=Object.entries(days).filter(([k,v])=>{
    const [y,m]=k.split("-");
    const ym=`${y}-${m}`;
    if(!selectedMonths.includes(ym))return false;
    if(selectedTypes.length>0&&!selectedTypes.includes(v.typ))return false;
    if(selectedLoads.length>0&&!selectedLoads.includes(v.load))return false;
    return true;
  });

  // Calculate statistics
  const stats={sections:{},loads:{},total:filtered.length};
  SECTIONS.forEach(s=>stats.sections[s]=0);
  LOADS.forEach(l=>stats.loads[l]=0);

  filtered.forEach(([,v])=>{
    stats.sections[TYP_SECTION[v.typ]]++;
    stats.loads[v.load]++;
  });

  // Render results
  const results=document.getElementById("filterResults");
  results.innerHTML=`
    <div class="filter-summary">
      <div class="stat">
        <b>${filtered.length}</b>
        <span>celkem dnů</span>
      </div>
      ${SECTIONS.map(s=>`
        <div class="stat">
          <b>${stats.sections[s]}</b>
          <span>${s}</span>
        </div>
      `).join("")}
    </div>

    <h3 style="font-size:18px;margin:20px 0 12px">Rozložení zátěže</h3>
    <div class="bars">
      ${LOADS.map(l=>{
        const pct=filtered.length>0?Math.round(100*stats.loads[l]/filtered.length):0;
        return `
          <div class="bar">
            <span>${l}</span>
            <div class="track">
              <div class="fill" style="width:${pct}%;background:${LOAD_COLOR[l]}"></div>
            </div>
            <span class="pct">${pct} %</span>
          </div>
        `;
      }).join("")}
    </div>

    <h3 style="font-size:18px;margin:20px 0 12px">Všechny dny (${filtered.length})</h3>
    <table class="filter-table">
      <thead>
        <tr>
          <th>Datum</th>
          <th>Typ práce</th>
          <th>Zátěž</th>
          <th>Poznámka</th>
        </tr>
      </thead>
      <tbody>
        ${filtered.sort((a,b)=>b[0].localeCompare(a[0])).map(([k,v])=>{
          const [y,m,d]=k.split("-");
          return `
            <tr>
              <td>${d}.${m}.${y}</td>
              <td>${v.typ}</td>
              <td style="color:${LOAD_COLOR[v.load]};font-weight:600">${v.load}</td>
              <td>${v.note||"-"}</td>
            </tr>
          `;
        }).join("")}
      </tbody>
    </table>
  `;
}

function resetFilters(){
  document.querySelectorAll("#monthFilters input").forEach(el=>el.checked=true);
  document.querySelectorAll("#typeFilters button").forEach(el=>el.setAttribute("aria-pressed","false"));
  document.querySelectorAll("#loadFilters button").forEach(el=>el.setAttribute("aria-pressed","false"));
  document.getElementById("filterResults").innerHTML="";
}

document.getElementById("applyFilters")?.addEventListener("click",applyFilters);
document.getElementById("resetFilters")?.addEventListener("click",resetFilters);

// Make type/load filters toggle
document.addEventListener("click",e=>{
  if(e.target.closest("#typeFilters button")||e.target.closest("#loadFilters button")){
    const btn=e.target.closest("button");
    const pressed=btn.getAttribute("aria-pressed")==="true";
    btn.setAttribute("aria-pressed",String(!pressed));
  }
});

/* ---------- init ---------- */
(async()=>{
  try{
    const desktop=await claude.use("desktop");
    if(desktop&&desktop.install&&(await desktop.install.state())==="available"){
      const b=document.getElementById("installBtn");
      b.hidden=false;
      b.onclick=()=>{try{desktop.install.request();}catch(e){}};
    }
  }catch(e){}
})();
loadPalette();
render();
initStore();
initFilters();
