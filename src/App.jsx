import { useState, useRef } from "react";

// ── Tokens ────────────────────────────────────────────────────────────────────
const gold   = "#b89a5a";
const goldLt = "#d4b97a";
const goldDk = "#7a6030";
const goldBg = "#fdf7ec";
const goldBd = "#c4a465";

// All surfaces use CSS vars for light/dark compatibility
const C = {
  bg:       "var(--color-background-primary)",
  bgSurf:   "var(--color-background-secondary)",
  bgPage:   "var(--color-background-tertiary)",
  border:   "var(--color-border-tertiary)",
  borderMd: "var(--color-border-secondary)",
  text:     "var(--color-text-primary)",
  textSub:  "var(--color-text-secondary)",
  textMut:  "var(--color-text-tertiary)",
  success:  "#2a7a4b",
  successBg:"#e6f4ec",
  danger:   "#a32d2d",
  dangerBg: "#fde8e8",
  warn:     "#7a4a0a",
  warnBg:   "#fef3e2",
  // Structural shading
  sidebar:  "#f4f2ee",
  cardHead: "#f7f6f3",
  topbar:   "#1c1c1a",
};

// ── Shared styles ─────────────────────────────────────────────────────────────
const S = {
  btn:(v="default",sm=false)=>({
    display:"inline-flex",alignItems:"center",gap:5,
    padding: sm ? "4px 10px" : "7px 14px",
    border: v==="gold" ? `0.5px solid ${goldBd}` : "0.5px solid var(--color-border-secondary)",
    borderRadius:6, cursor:"pointer", fontSize: sm?11:12,
    fontFamily:"var(--font-sans)", fontWeight:500,
    background: v==="gold"   ? "transparent"      :
                v==="danger" ? C.dangerBg          :
                v==="success"? C.successBg         : "transparent",
    color:       v==="gold"   ? goldDk             :
                 v==="danger" ? C.danger            :
                 v==="success"? C.success           : C.textSub,
  }),
  input:{
    width:"100%", border:"0.5px solid var(--color-border-secondary)",
    borderRadius:6, padding:"7px 10px", fontSize:13,
    fontFamily:"var(--font-sans)", color:C.text,
    background:C.bg, boxSizing:"border-box",
  },
  select:{
    border:"0.5px solid var(--color-border-secondary)", borderRadius:6,
    padding:"6px 10px", fontSize:12, fontFamily:"var(--font-sans)",
    color:C.text, background:C.bg, cursor:"pointer",
  },
  card:{
    background:C.bg,
    border:"0.5px solid var(--color-border-tertiary)",
    borderRadius:12, overflow:"hidden", marginBottom:10,
  },
  cardHead:{
    padding:"11px 16px",
    background:C.cardHead,
    borderBottom:"0.5px solid var(--color-border-tertiary)",
    display:"flex", alignItems:"center", gap:9,
  },
  label:{
    fontSize:10, color:C.textMut, letterSpacing:"0.1em",
    textTransform:"uppercase", display:"block", marginBottom:5,
    fontFamily:"var(--font-sans)",
  },
  badge:(v)=>({
    fontSize:10, fontWeight:500, padding:"2px 8px",
    borderRadius:8, letterSpacing:"0.02em",
    background: v==="certified" ? C.successBg :
                v==="uploaded"  ? C.warnBg    :
                v==="returned"  ? C.dangerBg  : C.bgSurf,
    color:       v==="certified" ? C.success   :
                 v==="uploaded"  ? C.warn       :
                 v==="returned"  ? C.danger     : C.textMut,
  }),
};

// ── Data ──────────────────────────────────────────────────────────────────────
const STAGES = ["Inquiry","Consultation","Audit Scheduled","Active Retainer"];
const CATEGORIES = [
  { key:"estate",   label:"Estate",              icon:"⚖",
    fields:["Trust Agreement","Last Will & Testament","Codicil","Letter of Instruction"] },
  { key:"identity", label:"Identity",             icon:"🪪",
    fields:["Passport","Global Entry Card","Birth Certificate","Marriage Certificate"] },
  { key:"property", label:"Property",             icon:"🏠",
    fields:["Property Deed","Yacht / Boat Title","Vehicle Title","Homestead Declaration"] },
  { key:"health",   label:"Health & Directives",  icon:"🩺",
    fields:["Living Will / Medical Directive","Healthcare Power of Attorney","HIPAA Authorization","DNR Order"] },
];
const ALL_FIELDS = CATEGORIES.flatMap(c=>c.fields.map(f=>({catKey:c.key,fieldName:f})));

const mkClient = (id,name,stage="Inquiry") => ({
  id, name, stage, auditDate:"", retainerStart:"", notes:"",
  checklist: Object.fromEntries(
    CATEGORIES.map(c=>[c.key, Object.fromEntries(c.fields.map(f=>[f,false]))])
  ),
});

const INIT_CLIENTS = [
  mkClient("c1","Eleanor & James Worthington","Active Retainer"),
  mkClient("c2","Patricia Lennox","Consultation"),
  mkClient("c3","Robert & Susan Calloway","Audit Scheduled"),
];

// ── Helpers ───────────────────────────────────────────────────────────────────
const ts = ()=>new Date().toLocaleString("en-US",{month:"short",day:"numeric",year:"numeric",hour:"numeric",minute:"2-digit"});
const fileIcon = n => { const e=(n||"").split(".").pop().toLowerCase(); return e==="pdf"?"📄":["jpg","jpeg","png","webp"].includes(e)?"🖼":"📎"; };
const daysDiff = d => d ? Math.ceil((new Date(d)-new Date())/86400000) : null;
const initials = name => name.split(" ").filter(w=>w!=="&").map(w=>w[0]).filter((_,i,a)=>i===0||i===a.length-1).join("");

// ── Avatar ────────────────────────────────────────────────────────────────────
function Avatar({ name, size=32 }) {
  return (
    <div style={{width:size,height:size,borderRadius:"50%",background:goldBg,
      display:"flex",alignItems:"center",justifyContent:"center",
      fontSize:size*0.35,fontWeight:500,color:goldDk,flexShrink:0}}>
      {initials(name)}
    </div>
  );
}

// ── Badge ─────────────────────────────────────────────────────────────────────
function Badge({ status }) {
  const labels = { certified:"certified", uploaded:"awaiting review", returned:"returned", none:"not uploaded" };
  return <span style={S.badge(status)}>{labels[status]||status}</span>;
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function Stat({ n, label, accent=false }) {
  return (
    <div style={{background:"#eceae5",border:"1px solid #dedad3",borderRadius:8,padding:"14px 16px",flex:1,minWidth:100}}>
      <div style={{fontSize:26,fontWeight:500,color:accent?gold:"#2a2a28",lineHeight:1}}>{n}</div>
      <div style={{fontSize:11,color:"#7a7870",marginTop:5,letterSpacing:"0.02em"}}>{label}</div>
    </div>
  );
}

// ── Progress bar ──────────────────────────────────────────────────────────────
function ProgressRow({ name, done, total }) {
  const pct = total ? Math.round(done/total*100) : 0;
  return (
    <div style={{background:"#eceae5",border:"1px solid #dedad3",borderRadius:8,padding:"13px 15px",marginBottom:8}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:7}}>
        <span style={{fontSize:13,color:"#2a2a28"}}>{name}</span>
        <span style={{fontSize:12,color:gold,fontWeight:500}}>{pct}%</span>
      </div>
      <div style={{background:"#d4d1cc",borderRadius:3,height:4}}>
        <div style={{background:gold,borderRadius:3,height:4,width:`${pct}%`,transition:"width 0.3s"}}/>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  DASHBOARD
// ══════════════════════════════════════════════════════════════════════════════
function Dashboard({ clients }) {
  const byStage = s => clients.filter(c=>c.stage===s).length;
  return (
    <>
      <PageHeader title="Dashboard" sub={`${clients.length} clients · Blue Heron Vault operations`} />
      <div style={{padding:"20px 24px",overflowY:"auto",flex:1}}>
        <div style={{display:"flex",gap:10,marginBottom:20,flexWrap:"wrap"}}>
          <Stat n={clients.length}           label="Total clients"    accent />
          <Stat n={byStage("Active Retainer")} label="Active retainers" />
          <Stat n={byStage("Audit Scheduled")} label="Audits scheduled" />
          <Stat n={byStage("Inquiry")+byStage("Consultation")} label="In pipeline" />
        </div>
        <p style={S.label}>Audit completion</p>
        {clients.map(c => {
          const all = ALL_FIELDS.map(({catKey,fieldName})=>c.checklist[catKey]?.[fieldName]);
          return <ProgressRow key={c.id} name={c.name} done={all.filter(Boolean).length} total={all.length}/>;
        })}
      </div>
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  CLIENTS
// ══════════════════════════════════════════════════════════════════════════════
function ClientsView({ clients, setClients }) {
  const [editId, setEditId] = useState(null);
  const [form, setForm]     = useState({});
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");

  const openEdit = c => { setEditId(c.id); setForm({...c}); };
  const saveEdit = () => { setClients(p=>p.map(c=>c.id===editId?{...c,...form}:c)); setEditId(null); };
  const remove   = id => setClients(p=>p.filter(c=>c.id!==id));
  const add      = () => {
    if (!newName.trim()) return;
    setClients(p=>[...p, mkClient(`c${Date.now()}`,newName.trim())]);
    setNewName(""); setAdding(false);
  };

  return (
    <>
      <PageHeader title="Clients" sub="Pipeline management">
        <button style={S.btn("gold")} onClick={()=>setAdding(true)}>+ Add client</button>
      </PageHeader>
      <div style={{padding:"20px 24px",overflowY:"auto",flex:1}}>
        {adding && (
          <div style={{...S.card,padding:16,border:`0.5px solid ${goldBd}`,marginBottom:14}}>
            <label style={S.label}>Client name</label>
            <div style={{display:"flex",gap:8}}>
              <input style={{...S.input,flex:1}} value={newName} onChange={e=>setNewName(e.target.value)}
                placeholder="e.g. Margaret & Thomas Aldridge" autoFocus
                onKeyDown={e=>e.key==="Enter"&&add()} />
              <button style={S.btn("gold")} onClick={add}>Add</button>
              <button style={S.btn()} onClick={()=>setAdding(false)}>Cancel</button>
            </div>
          </div>
        )}
        {STAGES.map(stage=>{
          const sc = clients.filter(c=>c.stage===stage);
          return (
            <div key={stage} style={{marginBottom:22}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:9}}>
                <div style={{width:6,height:6,borderRadius:"50%",background:stage==="Active Retainer"?C.success:stage==="Audit Scheduled"?gold:C.borderMd}}/>
                <span style={{fontSize:10,fontWeight:500,letterSpacing:"0.1em",textTransform:"uppercase",color:C.textMut}}>{stage}</span>
                <span style={{fontSize:11,color:C.textMut,background:C.bgSurf,padding:"1px 7px",borderRadius:8}}>{sc.length}</span>
              </div>
              {sc.length===0 && <p style={{fontSize:13,color:C.textMut,fontStyle:"italic",paddingLeft:14}}>No clients</p>}
              {sc.map(c=>(
                <div key={c.id} style={S.card}>
                  {editId===c.id ? (
                    <div style={{padding:16}}>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
                        <div>
                          <label style={S.label}>Name</label>
                          <input style={S.input} value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))}/>
                        </div>
                        <div>
                          <label style={S.label}>Stage</label>
                          <select style={{...S.select,width:"100%"}} value={form.stage} onChange={e=>setForm(p=>({...p,stage:e.target.value}))}>
                            {STAGES.map(s=><option key={s}>{s}</option>)}
                          </select>
                        </div>
                        <div>
                          <label style={S.label}>Audit date</label>
                          <input type="date" style={S.input} value={form.auditDate||""} onChange={e=>setForm(p=>({...p,auditDate:e.target.value}))}/>
                        </div>
                        <div>
                          <label style={S.label}>Retainer start</label>
                          <input type="date" style={S.input} value={form.retainerStart||""} onChange={e=>setForm(p=>({...p,retainerStart:e.target.value}))}/>
                        </div>
                      </div>
                      <div style={{marginBottom:12}}>
                        <label style={S.label}>Notes</label>
                        <textarea style={{...S.input,minHeight:56,resize:"vertical"}} value={form.notes||""} onChange={e=>setForm(p=>({...p,notes:e.target.value}))}/>
                      </div>
                      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
                        <button style={S.btn()} onClick={()=>setEditId(null)}>Cancel</button>
                        <button style={S.btn("gold")} onClick={saveEdit}>Save</button>
                      </div>
                    </div>
                  ) : (
                    <div style={{padding:"12px 16px",display:"flex",alignItems:"center",gap:12}}>
                      <Avatar name={c.name}/>
                      <div style={{flex:1}}>
                        <p style={{fontSize:14,fontWeight:500,color:C.text,margin:0}}>{c.name}</p>
                        <p style={{fontSize:11,color:C.textSub,marginTop:3}}>
                          {c.auditDate?`Audit: ${c.auditDate}`:"No audit date"}
                          {c.retainerStart?` · Retainer: ${c.retainerStart}`:""}
                        </p>
                      </div>
                      <button style={S.btn("default",true)} onClick={()=>openEdit(c)}>Edit</button>
                      <button style={S.btn("danger",true)} onClick={()=>remove(c.id)}>Remove</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  RED FOLDER
// ══════════════════════════════════════════════════════════════════════════════
function RedFolderView({ clients, setClients }) {
  const [selId, setSelId] = useState(clients[0]?.id||"");
  const client = clients.find(c=>c.id===selId);

  const toggle = (catKey,field) => setClients(p=>p.map(c=>{
    if (c.id!==selId) return c;
    return {...c, checklist:{...c.checklist,[catKey]:{...c.checklist[catKey],[field]:!c.checklist[catKey][field]}}};
  }));

  if (!client) return null;
  const all = ALL_FIELDS.map(({catKey,fieldName})=>client.checklist[catKey]?.[fieldName]);
  const done = all.filter(Boolean).length;
  const pct  = all.length ? Math.round(done/all.length*100) : 0;

  return (
    <>
      <PageHeader title="Red Folder Audit" sub="Document inventory checklist">
        <select style={S.select} value={selId} onChange={e=>setSelId(e.target.value)}>
          {clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </PageHeader>
      <div style={{padding:"20px 24px",overflowY:"auto",flex:1}}>
        <div style={{background:"#eceae5",border:"1px solid #dedad3",borderRadius:8,padding:"14px 16px",marginBottom:18,display:"flex",alignItems:"center",gap:16}}>
          <div style={{flex:1}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:7}}>
              <span style={{fontSize:13,color:C.text,fontWeight:500}}>{client.name}</span>
              <span style={{fontSize:12,color:gold,fontWeight:500}}>{done} / {all.length}</span>
            </div>
            <div style={{background:C.border,borderRadius:3,height:4}}>
              <div style={{background:gold,borderRadius:3,height:4,width:`${pct}%`,transition:"width 0.3s"}}/>
            </div>
          </div>
        </div>
        {CATEGORIES.map(cat=>{
          const catDone = cat.fields.filter(f=>client.checklist[cat.key]?.[f]).length;
          return (
            <div key={cat.key} style={S.card}>
              <div style={S.cardHead}>
                <span style={{color:gold,fontSize:14}}>{cat.icon}</span>
                <span style={{fontSize:13,fontWeight:500,color:C.text,flex:1}}>{cat.label}</span>
                <span style={{fontSize:11,color:catDone===cat.fields.length?C.success:C.textSub,background:C.bgSurf,padding:"2px 8px",borderRadius:8}}>
                  {catDone} / {cat.fields.length}
                </span>
              </div>
              <div style={{padding:"2px 16px 8px"}}>
                {cat.fields.map(field=>{
                  const checked = client.checklist[cat.key]?.[field]||false;
                  return (
                    <div key={field} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 0",borderBottom:`0.5px solid ${C.border}`,cursor:"pointer"}}
                      onClick={()=>toggle(cat.key,field)}>
                      <div style={{width:18,height:18,borderRadius:4,border:`0.5px solid ${checked?C.success:C.borderMd}`,background:checked?C.successBg:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all 0.15s"}}>
                        {checked&&<span style={{color:C.success,fontSize:12,lineHeight:1}}>✓</span>}
                      </div>
                      <span style={{fontSize:13,color:checked?C.textSub:C.text,textDecoration:checked?"line-through":"none"}}>{field}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  DOCUMENTS — UPLOAD & CERTIFY
// ══════════════════════════════════════════════════════════════════════════════
function DocumentsView({ clients, docs, setDocs, expiries, setExpiries }) {
  const [selId, setSelId]           = useState(clients[0]?.id||"");
  const [expanded, setExpanded]     = useState({estate:true,identity:false,property:false,health:false});
  const [reviewTarget, setReview]   = useState(null);
  const [opNote, setOpNote]         = useState("");
  const [opExpiry, setOpExpiry]     = useState("");
  const [dragOver, setDragOver]     = useState(null);
  const [pendingUp, setPending]     = useState(null);
  const [linkEdits, setLinkEdits]   = useState({});
  const [log, setLog]               = useState([]);
  const fileRef = useRef();

  const client   = clients.find(c=>c.id===selId);
  const getDoc   = (ck,fn) => docs[selId]?.[ck]?.[fn]||null;
  const setDoc   = (ck,fn,v) => setDocs(p=>({...p,[selId]:{...p[selId],[ck]:{...p[selId]?.[ck],[fn]:v}}}));
  const addLog   = (t,color=gold) => setLog(p=>[{t,color,time:ts()},...p].slice(0,40));
  const lk       = (ck,fn) => `${selId}-${ck}-${fn}`;

  const handleFiles = (ck,fn,files) => {
    const file=files[0]; if (!file) return;
    const r=new FileReader();
    r.onload=e=>{
      setDoc(ck,fn,{status:"uploaded",name:file.name,size:file.size,dataUrl:e.target.result,
        uploadedAt:ts(),vaultLink:getDoc(ck,fn)?.vaultLink||"",certifiedAt:null,note:""});
      addLog(`Uploaded "${file.name}" → ${fn}`,C.warn);
    };
    r.readAsDataURL(file);
  };
  const triggerUpload = (ck,fn) => { setPending({ck,fn}); fileRef.current.value=""; fileRef.current.click(); };

  const saveLink = (ck,fn) => {
    const doc=getDoc(ck,fn); if (!doc) return;
    const link=linkEdits[lk(ck,fn)]??doc.vaultLink;
    setDoc(ck,fn,{...doc,vaultLink:link});
    if (link) addLog(`Vault link saved — ${fn}`,C.success);
  };

  const openReview = (ck,fn) => {
    setReview({ck,fn});
    setOpNote(getDoc(ck,fn)?.note||"");
    setOpExpiry(expiries[selId]?.[fn]||"");
  };
  const closeReview = () => { setReview(null); setOpNote(""); setOpExpiry(""); };

  const certify = () => {
    const {ck,fn}=reviewTarget, doc=getDoc(ck,fn);
    setDoc(ck,fn,{...doc,status:"certified",certifiedAt:ts(),note:opNote});
    if (opExpiry) setExpiries(p=>({...p,[selId]:{...p[selId],[fn]:opExpiry}}));
    addLog(`✦ Certified: "${fn}" — ${client.name}`,C.success);
    closeReview();
  };
  const returnDoc = () => {
    const {ck,fn}=reviewTarget, doc=getDoc(ck,fn);
    setDoc(ck,fn,{...doc,status:"returned",note:opNote});
    addLog(`Returned: "${fn}" — ${client.name}`,C.danger);
    closeReview();
  };

  const allDocs  = ALL_FIELDS.map(({catKey,fieldName})=>getDoc(catKey,fieldName)).filter(Boolean);
  const nCert    = allDocs.filter(d=>d.status==="certified").length;
  const nUp      = allDocs.filter(d=>d.status==="uploaded").length;
  const nLink    = allDocs.filter(d=>d.vaultLink).length;

  if (!client) return null;

  return (
    <>
      <input type="file" ref={fileRef} style={{display:"none"}}
        onChange={e=>{if(pendingUp)handleFiles(pendingUp.ck,pendingUp.fn,e.target.files);setPending(null);}}
        accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"/>

      <PageHeader title="Upload & Certify" sub={`${client.name}`}>
        <select style={S.select} value={selId} onChange={e=>setSelId(e.target.value)}>
          {clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </PageHeader>

      <div style={{padding:"20px 24px",overflowY:"auto",flex:1}}>
        <div style={{display:"flex",gap:10,marginBottom:20,flexWrap:"wrap"}}>
          <Stat n={`${allDocs.length}/${ALL_FIELDS.length}`} label="Uploaded" accent />
          <Stat n={nUp}   label="Awaiting review" />
          <Stat n={nCert} label="Certified" />
          <Stat n={nLink} label="Vault links" />
        </div>

        {CATEGORIES.map(cat=>{
          const catDocs = Object.values(docs[selId]?.[cat.key]||{});
          const catCert = catDocs.filter(d=>d.status==="certified").length;
          const open    = expanded[cat.key];
          return (
            <div key={cat.key} style={S.card}>
              <div style={{...S.cardHead,cursor:"pointer"}}
                onClick={()=>setExpanded(p=>({...p,[cat.key]:!p[cat.key]}))}>
                <span style={{color:gold,fontSize:14}}>{cat.icon}</span>
                <span style={{fontSize:13,fontWeight:500,color:C.text,flex:1}}>{cat.label}</span>
                <span style={{fontSize:11,color:catCert===cat.fields.length?C.success:C.textSub,background:C.bgSurf,padding:"2px 8px",borderRadius:8}}>
                  {catCert} / {cat.fields.length} certified
                </span>
                <span style={{fontSize:10,color:C.textMut,marginLeft:6}}>{open?"▲":"▼"}</span>
              </div>
              {open && (
                <div style={{padding:"2px 16px 8px"}}>
                  {cat.fields.map(fieldName=>{
                    const doc   = getDoc(cat.key,fieldName);
                    const dk    = `${cat.key}-${fieldName}`;
                    const linkv = linkEdits[lk(cat.key,fieldName)]??doc?.vaultLink??"";
                    return (
                      <div key={fieldName} style={{borderBottom:`0.5px solid ${C.border}`,padding:"11px 0"}}>
                        <div style={{display:"flex",alignItems:"center",gap:9,flexWrap:"wrap"}}>
                          <span style={{fontSize:15,flexShrink:0}}>{doc?fileIcon(doc.name):"○"}</span>
                          <span style={{fontSize:13,color:C.text,flex:1}}>{fieldName}</span>
                          <Badge status={doc?.status||"none"}/>
                        </div>

                        {!doc && (
                          <div style={{border:`0.5px dashed ${dragOver===dk?goldBd:C.borderMd}`,borderRadius:6,
                            padding:"10px 14px",textAlign:"center",cursor:"pointer",
                            background:dragOver===dk?goldBg:C.bgSurf,marginTop:9,transition:"all 0.12s"}}
                            onDragOver={e=>{e.preventDefault();setDragOver(dk);}}
                            onDragLeave={()=>setDragOver(null)}
                            onDrop={e=>{e.preventDefault();setDragOver(null);handleFiles(cat.key,fieldName,e.dataTransfer.files);}}
                            onClick={()=>triggerUpload(cat.key,fieldName)}>
                            <span style={{fontSize:12,color:C.textSub}}>Drop file or <span style={{color:gold,fontWeight:500}}>browse</span></span>
                          </div>
                        )}

                        {doc && (
                          <div style={{paddingLeft:24,marginTop:7}}>
                            <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",marginBottom:6}}>
                              <span style={{fontSize:11,color:C.textMut}}>{doc.name} · {(doc.size/1024).toFixed(0)} KB · {doc.uploadedAt}</span>
                              {doc.status==="certified" && <span style={{fontSize:11,color:C.success,fontWeight:500}}>✦ {doc.certifiedAt}</span>}
                              {doc.status==="uploaded"  && <button style={S.btn("gold",true)} onClick={()=>openReview(cat.key,fieldName)}>Review & certify</button>}
                              {doc.status==="returned"  && <button style={S.btn("default",true)} onClick={()=>triggerUpload(cat.key,fieldName)}>Re-upload</button>}
                              <button style={S.btn("default",true)} onClick={()=>triggerUpload(cat.key,fieldName)}>Replace</button>
                            </div>
                            {doc.note && <p style={{fontSize:11,color:C.textSub,fontStyle:"italic",marginBottom:6}}>{doc.note}</p>}
                            <div style={{display:"flex",gap:7,marginTop:4}}>
                              <input style={{...S.input,padding:"5px 9px",fontSize:12}}
                                placeholder="Paste vault link (Tresorit, Dropbox…)"
                                value={linkv}
                                onChange={e=>setLinkEdits(p=>({...p,[lk(cat.key,fieldName)]:e.target.value}))}
                                onBlur={()=>saveLink(cat.key,fieldName)}/>
                              <button style={S.btn(doc.vaultLink?"success":"default",true)} onClick={()=>saveLink(cat.key,fieldName)}>
                                {doc.vaultLink?"✓ Linked":"Save"}
                              </button>
                              {doc.vaultLink && <a href={doc.vaultLink} target="_blank" rel="noreferrer"
                                style={{...S.btn("default",true),textDecoration:"none"}}>Open ↗</a>}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {log.length>0 && (
          <div style={{background:"#eceae5",border:"1px solid #dedad3",borderRadius:8,padding:"14px 16px",marginTop:8}}>
            <p style={{...S.label,marginBottom:10}}>Activity log</p>
            {log.slice(0,8).map((e,i)=>(
              <div key={i} style={{display:"flex",gap:10,padding:"7px 0",borderBottom:`0.5px solid ${C.border}`}}>
                <div style={{width:6,height:6,borderRadius:"50%",background:e.color,marginTop:5,flexShrink:0}}/>
                <span style={{fontSize:12,color:C.text,flex:1}}>{e.t}</span>
                <span style={{fontSize:11,color:C.textMut,whiteSpace:"nowrap"}}>{e.time}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Certification modal */}
      {reviewTarget && (()=>{
        const {ck,fn}=reviewTarget, doc=getDoc(ck,fn);
        if (!doc) return null;
        const isImg = ["jpg","jpeg","png","webp"].some(e=>doc.name.toLowerCase().endsWith(e));
        const isPDF = doc.name.toLowerCase().endsWith(".pdf");
        return (
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.35)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:16}}
            onClick={closeReview}>
            <div style={{background:C.bg,borderRadius:12,width:520,maxWidth:"100%",overflow:"hidden",border:`0.5px solid ${C.borderMd}`}}
              onClick={e=>e.stopPropagation()}>

              {/* Modal header */}
              <div style={{padding:"16px 20px",borderBottom:`0.5px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <div>
                  <p style={{fontSize:15,fontWeight:500,color:C.text,margin:0}}>Certification review</p>
                  <p style={{fontSize:11,color:C.textSub,marginTop:2}}>{fn} · {client.name}</p>
                </div>
                <button style={{...S.btn("default",true),borderRadius:"50%",padding:"4px 8px"}} onClick={closeReview}>✕</button>
              </div>

              <div style={{padding:20}}>
                {/* Preview */}
                <div style={{background:"#eceae5",borderRadius:8,padding:12,marginBottom:16,textAlign:"center",border:"1px solid #dedad3",maxHeight:220,overflow:"hidden"}}>
                  {isImg
                    ? <img src={doc.dataUrl} alt={doc.name} style={{maxWidth:"100%",maxHeight:200,objectFit:"contain",borderRadius:4}}/>
                    : isPDF
                    ? <iframe src={doc.dataUrl} title="preview" style={{width:"100%",height:200,border:"none",borderRadius:4}}/>
                    : <div style={{padding:"24px 0"}}>
                        <div style={{fontSize:32}}>{fileIcon(doc.name)}</div>
                        <p style={{color:C.textSub,fontSize:13,marginTop:8}}>{doc.name}</p>
                      </div>
                  }
                </div>

                {/* Certification statement — shown when already certified */}
                {doc.status==="certified" && (
                  <div style={{border:`0.5px solid ${C.success}`,borderRadius:8,padding:"14px 16px",background:C.successBg,marginBottom:16}}>
                    <p style={{fontSize:10,fontWeight:500,letterSpacing:"0.08em",textTransform:"uppercase",color:C.success,marginBottom:6}}>✦ Certified</p>
                    <p style={{fontSize:12,color:C.text,lineHeight:1.7,margin:0}}>
                      I certify that on {doc.certifiedAt}, I, a notary public of the State of Florida, personally
                      reviewed the original document presented by {client.name} and that this is a true,
                      accurate, and complete copy thereof.
                    </p>
                  </div>
                )}

                {/* Expiry date */}
                <div style={{marginBottom:14}}>
                  <label style={S.label}>Document expiry date <span style={{textTransform:"none",letterSpacing:0,color:C.textMut}}>(if applicable — auto-populates Compliance)</span></label>
                  <input type="date" style={{...S.input,maxWidth:220}}
                    value={opExpiry} onChange={e=>setOpExpiry(e.target.value)}/>
                </div>

                {/* Notary note */}
                <div style={{marginBottom:16}}>
                  <label style={S.label}>Notary note <span style={{textTransform:"none",letterSpacing:0,color:C.textMut}}>(optional)</span></label>
                  <textarea value={opNote} onChange={e=>setOpNote(e.target.value)}
                    placeholder="e.g. Original verified in-person · Commission no. 12345 · Exp. 03/2028"
                    style={{...S.input,minHeight:64,resize:"vertical"}}/>
                </div>

                <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
                  {doc.status!=="certified" && <>
                    <button style={S.btn("danger")} onClick={returnDoc}>Return for re-upload</button>
                    <button style={{...S.btn("gold"),background:goldBg}} onClick={certify}>✦ Certify document</button>
                  </>}
                  {doc.status==="certified" && <>
                    <button style={S.btn()} onClick={closeReview}>Close</button>
                    <button style={S.btn("danger")} onClick={returnDoc}>Revoke & return</button>
                  </>}
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  COMPLIANCE
// ══════════════════════════════════════════════════════════════════════════════
function ComplianceView({ clients, docs, expiries, setExpiries }) {
  // Fields worth tracking for expiry — only show if the doc has been uploaded for this client
  const EXPIRY_FIELDS = ["Passport","Global Entry Card","Living Will / Medical Directive","Healthcare Power of Attorney","Property Deed"];
  const setExp = (cid,f,d) => setExpiries(p=>({...p,[cid]:{...p[cid],[f]:d}}));

  // For a given client, return only fields that have been uploaded
  const uploadedFields = (cid) =>
    EXPIRY_FIELDS.filter(f =>
      CATEGORIES.some(cat => docs[cid]?.[cat.key]?.[f])
    );

  const statusLabel = days => days===null?"—":days<0?"Expired":days<=30?"Expires soon":days<=90?"Review due":"Current";
  const statusColor = days => days===null?C.textMut:days<0?C.danger:days<=30?C.danger:days<=90?C.warn:C.success;
  const statusBg    = days => days===null?"#eceae5":days<0?C.dangerBg:days<=30?C.dangerBg:days<=90?C.warnBg:C.successBg;

  const allTracked = clients.flatMap(c=>uploadedFields(c.id).map(f=>({cid:c.id,name:c.name,field:f,days:daysDiff(expiries[c.id]?.[f])})));
  const urgent  = allTracked.filter(x=>x.days!==null&&x.days<=90);
  const current = allTracked.filter(x=>x.days!==null&&x.days>90);
  const unset   = allTracked.filter(x=>x.days===null);

  return (
    <>
      <PageHeader title="Compliance" sub="Expiration tracking across all clients"/>
      <div style={{padding:"20px 24px",overflowY:"auto",flex:1}}>
        <div style={{display:"flex",gap:10,marginBottom:20,flexWrap:"wrap"}}>
          <Stat n={urgent.length}       label="Needs attention"/>
          <Stat n={current.length}      label="Current"/>
          <Stat n={allTracked.length}   label="Docs tracked" accent/>
        </div>
        {clients.map(c=>{
          const fields = uploadedFields(c.id);
          return (
          <div key={c.id} style={S.card}>
            <div style={S.cardHead}>
              <Avatar name={c.name} size={24}/>
              <span style={{fontSize:13,fontWeight:500,color:C.text}}>{c.name}</span>
              <span style={{fontSize:11,color:C.textMut,marginLeft:"auto"}}>{fields.length} document{fields.length!==1?"s":""} on file</span>
            </div>
            <div style={{padding:"2px 16px 8px"}}>
              {fields.length===0 && (
                <p style={{fontSize:13,color:C.textMut,fontStyle:"italic",padding:"12px 0"}}>
                  No expiry-tracked documents uploaded yet for this client.
                </p>
              )}
              {fields.map(field=>{
                const date = expiries[c.id]?.[field]||"";
                const days = daysDiff(date);
                const docStatus = CATEGORIES.map(cat=>docs[c.id]?.[cat.key]?.[field]).find(Boolean)?.status;
                return (
                  <div key={field} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 0",borderBottom:`0.5px solid ${C.border}`,flexWrap:"wrap"}}>
                    <div style={{flex:1}}>
                      <span style={{fontSize:13,color:C.text}}>{field}</span>
                      {docStatus && <span style={{...S.badge(docStatus),marginLeft:8}}>{docStatus}</span>}
                    </div>
                    <input type="date" style={{...S.select,padding:"4px 8px",fontSize:11}}
                      value={date} onChange={e=>setExp(c.id,field,e.target.value)}/>
                    {days!==null && (
                      <span style={{fontSize:10,fontWeight:500,padding:"2px 8px",borderRadius:8,background:statusBg(days),color:statusColor(days),minWidth:80,textAlign:"center"}}>
                        {statusLabel(days)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          );
        })}
      </div>
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  VAULT DELIVERY
// ══════════════════════════════════════════════════════════════════════════════
function VaultDeliveryView({ clients }) {
  const [selId, setSelId]       = useState(clients[0]?.id||"");
  const [checks, setChecks]     = useState({});
  const [delivered, setDelivered] = useState({});
  const client = clients.find(c=>c.id===selId);

  const STEPS = [
    "Vault app installed and confirmed on client device",
    "Client passphrase set privately — operator has no copy",
    "Client confirms access to every document in the vault",
    "Emergency access protocol reviewed and documented",
    "First quarterly sync appointment scheduled",
  ];

  const cChecks = checks[selId]||{};
  const allDone = STEPS.every((_,i)=>cChecks[i]);
  const toggle  = i => setChecks(p=>({...p,[selId]:{...p[selId],[i]:!p[selId]?.[i]}}));

  if (!client) return null;

  return (
    <>
      <PageHeader title="Vault Delivery" sub="In-person handoff checklist">
        <select style={S.select} value={selId} onChange={e=>setSelId(e.target.value)}>
          {clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </PageHeader>
      <div style={{padding:"20px 24px",overflowY:"auto",flex:1}}>
        {/* Client summary */}
        <div style={{background:"#eceae5",border:"1px solid #dedad3",borderRadius:8,padding:"14px 16px",marginBottom:16,display:"flex",alignItems:"center",gap:12}}>
          <Avatar name={client.name} size={36}/>
          <div style={{flex:1}}>
            <p style={{fontSize:14,fontWeight:500,color:C.text,margin:0}}>{client.name}</p>
            <p style={{fontSize:11,color:C.textSub,marginTop:2}}>
              {client.auditDate?`Audit: ${client.auditDate}`:"No audit date set"}
            </p>
          </div>
          {delivered[selId] && (
            <span style={{fontSize:11,fontWeight:500,background:C.successBg,color:C.success,padding:"4px 10px",borderRadius:8}}>✦ Delivered</span>
          )}
        </div>

        <div style={S.card}>
          <div style={S.cardHead}>
            <span style={{fontSize:13,fontWeight:500,color:C.text,flex:1}}>Handoff checklist</span>
            <span style={{fontSize:11,color:allDone?C.success:C.textSub,background:C.bgSurf,padding:"2px 8px",borderRadius:8}}>
              {STEPS.filter((_,i)=>cChecks[i]).length} / {STEPS.length}
            </span>
          </div>
          <div style={{padding:"2px 16px 8px"}}>
            {STEPS.map((step,i)=>(
              <div key={i} style={{display:"flex",alignItems:"flex-start",gap:10,padding:"10px 0",borderBottom:`0.5px solid ${C.border}`,cursor:"pointer"}}
                onClick={()=>toggle(i)}>
                <div style={{width:20,height:20,borderRadius:4,border:`0.5px solid ${cChecks[i]?C.success:C.borderMd}`,
                  background:cChecks[i]?C.successBg:"transparent",display:"flex",alignItems:"center",justifyContent:"center",
                  flexShrink:0,marginTop:1,transition:"all 0.15s"}}>
                  {cChecks[i]&&<span style={{color:C.success,fontSize:12}}>✓</span>}
                </div>
                <span style={{fontSize:13,color:cChecks[i]?C.textSub:C.text}}>{step}</span>
              </div>
            ))}
          </div>
        </div>

        {!delivered[selId] && (
          <button style={{...S.btn(allDone?"gold":"default"),width:"100%",justifyContent:"center",
            padding:"11px",fontSize:13,opacity:allDone?1:0.45,cursor:allDone?"pointer":"not-allowed",
            ...(allDone?{background:goldBg}:{})}}
            onClick={()=>allDone&&setDelivered(p=>({...p,[selId]:true}))}
            disabled={!allDone}>
            {allDone?"✦ Confirm vault delivered":"Complete all steps to confirm"}
          </button>
        )}
        {delivered[selId] && (
          <div style={{border:`0.5px solid ${C.success}`,borderRadius:8,padding:"14px 16px",background:C.successBg,marginTop:8}}>
            <p style={{fontSize:12,fontWeight:500,color:C.success,margin:0}}>✦ Vault successfully delivered</p>
            <p style={{fontSize:12,color:C.text,marginTop:6,lineHeight:1.65}}>
              Handoff for {client.name} is complete. Blue Heron Vault retains metadata only.
              All document access is controlled exclusively by the client.
            </p>
          </div>
        )}
      </div>
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  PAGE HEADER
// ══════════════════════════════════════════════════════════════════════════════
function PageHeader({ title, sub, children }) {
  return (
    <div style={{padding:"18px 24px 14px",borderBottom:`1px solid #e8e5e0`,
      background:C.cardHead,
      flexShrink:0,
      display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12}}>
      <div>
        <h2 style={{fontSize:17,fontWeight:500,color:C.text,margin:0}}>{title}</h2>
        {sub && <p style={{fontSize:12,color:C.textSub,marginTop:3}}>{sub}</p>}
      </div>
      {children && <div style={{display:"flex",gap:8,alignItems:"center",flexShrink:0}}>{children}</div>}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  NAV
// ══════════════════════════════════════════════════════════════════════════════
const NAV = [
  { key:"dashboard", label:"Dashboard",       icon:"◈" },
  { key:"clients",   label:"Clients",          icon:"○" },
  { key:"redfolder", label:"Red Folder",       icon:"□" },
  { key:"documents", label:"Upload & Certify", icon:"✦" },
  { key:"compliance",label:"Compliance",       icon:"◷" },
  { key:"delivery",  label:"Vault Delivery",   icon:"◻" },
];

// ══════════════════════════════════════════════════════════════════════════════
//  APP
// ══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [view, setView]       = useState("dashboard");
  const [clients, setClients] = useState(INIT_CLIENTS);
  const [docs, setDocs]       = useState({});
  const [expiries, setExpiries] = useState({});

  return (
    <div style={{fontFamily:"var(--font-sans, system-ui, sans-serif)",background:C.bgPage,
      minHeight:"100vh",display:"flex",flexDirection:"column"}}>

      {/* Top bar */}
      <div style={{height:52,background:C.topbar,borderBottom:`3px solid ${gold}`,
        display:"flex",alignItems:"center",padding:"0 20px",gap:14,flexShrink:0}}>
        <img src="/bhv-icon.png" alt="Blue Heron Vault" style={{height:38,width:"auto",display:"block"}}/>
        <div style={{width:"1px",height:28,background:"rgba(255,255,255,0.15)",margin:"0 4px"}}/>
        <div>
          <div style={{fontSize:13,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",lineHeight:1.2}}>
            <span style={{color:"#fff"}}>BLUE HERON </span><span style={{color:gold}}>VAULT</span>
          </div>
          <div style={{fontSize:9,color:"rgba(255,255,255,0.45)",letterSpacing:"0.12em",textTransform:"uppercase",marginTop:3}}>Operations</div>
        </div>
      </div>

      <div style={{display:"flex",flex:1,minHeight:0}}>
        {/* Sidebar */}
        <div style={{width:200,background:C.sidebar,borderRight:`1px solid #e5e2db`,
          flexShrink:0,paddingTop:12,display:"flex",flexDirection:"column"}}>
          <div style={{padding:"0 8px",flex:1,overflowY:"auto"}}>
            <p style={{...S.label,padding:"0 8px 6px"}}>Workspace</p>
            {NAV.map(n=>(
              <div key={n.key} style={{display:"flex",alignItems:"center",gap:9,padding:"8px 10px",
                borderRadius:6,cursor:"pointer",margin:"1px 0",
                background:view===n.key?"#fff":"transparent",
                borderLeft:view===n.key?`2px solid ${gold}`:"2px solid transparent",
                borderTopLeftRadius:0,borderBottomLeftRadius:0,
                color:view===n.key?C.text:C.textSub,fontSize:13,transition:"background 0.12s"}}
                onClick={()=>setView(n.key)}>
                <span style={{fontSize:13,width:16,textAlign:"center",color:view===n.key?gold:"#999"}}>{n.icon}</span>
                <span style={{fontWeight:view===n.key?500:400}}>{n.label}</span>
              </div>
            ))}
            <div style={{borderTop:"1px solid #e5e2db",margin:"10px 0"}}/>
            <p style={{...S.label,padding:"0 8px 6px"}}>Clients</p>
            {clients.map(c=>(
              <div key={c.id} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 10px",
                borderRadius:6,cursor:"pointer",margin:"1px 0"}}
                onClick={()=>setView("clients")}>
                <Avatar name={c.name} size={22}/>
                <span style={{fontSize:12,color:C.textSub,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                  {c.name.split(" ")[0]}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Main */}
        <div style={{flex:1,display:"flex",flexDirection:"column",minWidth:0,background:C.bgPage}}>
          <div style={{background:C.bg,flex:1,display:"flex",flexDirection:"column",margin:0,minHeight:0,overflowY:"hidden"}}>
            {view==="dashboard"  && <Dashboard         clients={clients} docs={docs}/>}
            {view==="clients"    && <ClientsView       clients={clients} setClients={setClients}/>}
            {view==="redfolder"  && <RedFolderView     clients={clients} setClients={setClients}/>}
            {view==="documents"  && <DocumentsView     clients={clients} docs={docs} setDocs={setDocs} expiries={expiries} setExpiries={setExpiries}/>}
            {view==="compliance" && <ComplianceView    clients={clients} docs={docs} expiries={expiries} setExpiries={setExpiries}/>}
            {view==="delivery"   && <VaultDeliveryView clients={clients} docs={docs}/>}
          </div>
        </div>
      </div>
    </div>
  );
}
