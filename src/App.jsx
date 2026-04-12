import { useState, useRef } from "react";

// ── Helpers ──────────────────────────────────────────────────────────────────
const uid = () => crypto.randomUUID();
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("pt-BR") : "—";
const fmtBytes = (b) => b < 1024*1024 ? (b/1024).toFixed(1)+"KB" : (b/1024/1024).toFixed(1)+"MB";

function mask(value, pattern) {
  let i = 0, v = value.replace(/\D/g, "");
  return pattern.replace(/#/g, () => v[i++] || "").replace(/[#]+$/, "");
}
const maskCPF   = (v) => mask(v, "###.###.###-##");
const maskCNPJ  = (v) => mask(v, "##.###.###/####-##");
const maskCEP   = (v) => mask(v, "#####-###");
const maskPhone = (v) => v.replace(/\D/g,"").length <= 10
  ? mask(v,"(##) ####-####") : mask(v,"(##) #####-####");
const maskMoney = (v) => {
  const n = v.replace(/\D/g,"");
  return n ? "R$ " + (parseInt(n)/100).toFixed(2).replace(".",",").replace(/\B(?=(\d{3})+(?!\d))/g,".") : "";
};

function validCPF(c) {
  c = c.replace(/\D/g,""); if(c.length!==11||/^(\d)\1+$/.test(c)) return false;
  let s=0; for(let i=0;i<9;i++) s+=+c[i]*(10-i);
  let r=11-s%11; if(r>=10) r=0; if(r!==+c[9]) return false;
  s=0; for(let i=0;i<10;i++) s+=+c[i]*(11-i);
  r=11-s%11; if(r>=10) r=0; return r===+c[10];
}
function validCNPJ(c) {
  c=c.replace(/\D/g,""); if(c.length!==14) return false;
  const calc=(n,w)=>{let s=0,p=w;for(let i=0;i<n;i++){s+=+c[i]*p--;if(p<2)p=9;}return s%11<2?0:11-s%11;};
  return calc(12,5)===+c[12]&&calc(13,6)===+c[13];
}

// ── CSS ───────────────────────────────────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  :root{
    --bg:#F0EDE8; --surface:#FAFAF8; --card:#FFFFFF;
    --teal:#1A7A6E; --teal-lt:#E6F4F1; --teal-dk:#0F5049;
    --accent:#C8873A; --text:#1C1C1C; --muted:#6B6B6B;
    --border:#D8D4CC; --err:#C0392B; --radius:12px;
    --shadow:0 2px 16px rgba(0,0,0,.07);
  }
  body{font-family:'DM Sans',sans-serif;background:var(--bg);color:var(--text);min-height:100vh;}
  h1,h2,h3{font-family:'DM Serif Display',serif;}
  .app{max-width:960px;margin:0 auto;padding:24px 16px 64px;}
  .header{text-align:center;padding:48px 0 32px;}
  .header h1{font-size:clamp(2rem,5vw,3rem);color:var(--teal-dk);line-height:1.1;}
  .header p{color:var(--muted);margin-top:8px;font-size:.95rem;}
  .logo-bar{display:flex;align-items:center;justify-content:center;gap:10px;margin-bottom:16px;}
  .logo-icon{width:44px;height:44px;background:var(--teal);border-radius:10px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:1.3rem;}
  .tabs{display:flex;gap:8px;background:var(--surface);border-radius:14px;padding:6px;margin-bottom:32px;box-shadow:var(--shadow);}
  .tab{flex:1;padding:14px 8px;border:none;background:none;cursor:pointer;border-radius:10px;font-family:'DM Sans',sans-serif;font-size:.95rem;font-weight:500;color:var(--muted);transition:all .2s;}
  .tab.active{background:var(--teal);color:#fff;box-shadow:0 4px 12px rgba(26,122,110,.3);}
  .tab:hover:not(.active){background:var(--teal-lt);color:var(--teal);}
  .card{background:var(--card);border-radius:var(--radius);box-shadow:var(--shadow);margin-bottom:20px;overflow:hidden;}
  .card-header{background:var(--teal);color:#fff;padding:14px 20px;display:flex;align-items:center;gap:10px;}
  .card-header h3{font-family:'DM Sans',sans-serif;font-size:.9rem;font-weight:600;letter-spacing:.05em;text-transform:uppercase;}
  .card-header .icon{font-size:1.1rem;}
  .card-body{padding:20px;}
  .grid{display:grid;gap:16px;}
  .g2{grid-template-columns:1fr 1fr;}
  @media(max-width:600px){.g2{grid-template-columns:1fr;}}
  .field{display:flex;flex-direction:column;gap:5px;}
  .field label{font-size:.78rem;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.04em;}
  .field input,.field select,.field textarea{padding:10px 13px;border:1.5px solid var(--border);border-radius:8px;font-family:'DM Sans',sans-serif;font-size:.92rem;background:var(--surface);transition:border-color .2s,box-shadow .2s;outline:none;color:var(--text);}
  .field input:focus,.field select:focus,.field textarea:focus{border-color:var(--teal);box-shadow:0 0 0 3px rgba(26,122,110,.12);}
  .field input.err,.field select.err{border-color:var(--err);}
  .field .errmsg{font-size:.75rem;color:var(--err);}
  .field textarea{resize:vertical;min-height:72px;}
  .tipo-group{display:flex;gap:10px;}
  .tipo-btn{flex:1;padding:12px;border:1.5px solid var(--border);border-radius:8px;background:var(--surface);cursor:pointer;font-family:'DM Sans',sans-serif;font-size:.9rem;font-weight:500;color:var(--muted);transition:all .2s;text-align:center;}
  .tipo-btn.sel{border-color:var(--teal);background:var(--teal-lt);color:var(--teal);font-weight:600;}
  .dyn-row{display:grid;gap:10px;align-items:end;background:var(--bg);border-radius:8px;padding:12px;margin-bottom:8px;}
  .btn-add{display:inline-flex;align-items:center;gap:6px;padding:8px 16px;background:none;border:1.5px dashed var(--teal);color:var(--teal);border-radius:8px;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:.85rem;font-weight:600;transition:all .2s;}
  .btn-add:hover{background:var(--teal-lt);}
  .btn-rm{padding:6px 10px;background:none;border:1.5px solid #e0aeae;border-radius:6px;color:var(--err);cursor:pointer;font-size:.8rem;transition:all .2s;white-space:nowrap;}
  .btn-rm:hover{background:#fdeaea;}
  .check-item{display:flex;align-items:flex-start;gap:10px;cursor:pointer;}
  .check-item input[type=checkbox]{width:18px;height:18px;accent-color:var(--teal);margin-top:2px;flex-shrink:0;cursor:pointer;}
  .check-item span{font-size:.88rem;line-height:1.5;color:var(--text);}

  /* ── Doc upload ── */
  .doc-list{display:flex;flex-direction:column;gap:0;}
  .doc-item{border:1.5px solid var(--border);border-radius:10px;margin-bottom:10px;overflow:hidden;transition:border-color .2s,box-shadow .2s;}
  .doc-item.checked{border-color:var(--teal);box-shadow:0 0 0 3px rgba(26,122,110,.08);}
  .doc-row{display:flex;align-items:center;gap:12px;padding:13px 16px;cursor:pointer;background:var(--surface);user-select:none;}
  .doc-row:hover{background:var(--teal-lt);}
  .doc-cb{width:20px;height:20px;accent-color:var(--teal);flex-shrink:0;cursor:pointer;}
  .doc-label{font-size:.88rem;line-height:1.45;color:var(--text);flex:1;}
  .doc-badge{font-size:.72rem;font-weight:700;padding:3px 9px;border-radius:20px;white-space:nowrap;flex-shrink:0;}
  .doc-badge.ok{background:#d4edda;color:#155724;}
  .doc-badge.empty{background:#fff3cd;color:#7B5800;}
  .upload-zone{padding:14px 16px 16px;border-top:1px solid var(--border);background:#F7F9F8;}
  .drop-area{border:2px dashed var(--border);border-radius:8px;padding:18px 12px;text-align:center;cursor:pointer;transition:all .2s;}
  .drop-area:hover,.drop-area.drag{border-color:var(--teal);background:var(--teal-lt);}
  .drop-text{font-size:.82rem;color:var(--muted);pointer-events:none;}
  .drop-text strong{color:var(--teal);}
  .file-chips{display:flex;flex-wrap:wrap;gap:7px;margin-top:12px;}
  .chip{display:flex;align-items:center;gap:6px;background:#fff;border:1.5px solid #b2dbd6;border-radius:20px;padding:5px 10px;font-size:.78rem;color:var(--teal-dk);max-width:260px;}
  .chip-icon{font-size:.95rem;flex-shrink:0;}
  .chip-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;min-width:0;}
  .chip-size{color:var(--muted);white-space:nowrap;font-size:.72rem;}
  .chip-rm{background:none;border:none;cursor:pointer;color:#999;font-size:.9rem;padding:0 2px;line-height:1;flex-shrink:0;transition:color .15s;}
  .chip-rm:hover{color:var(--err);}

  .attach-summary{background:var(--teal-lt);border:1.5px solid #b2dbd6;border-radius:10px;padding:14px 18px;margin-top:16px;}
  .attach-summary h4{font-size:.8rem;font-weight:700;color:var(--teal-dk);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px;}
  .attach-row{display:flex;align-items:baseline;gap:8px;font-size:.82rem;color:var(--text);padding:3px 0;}
  .attach-row .dot{width:6px;height:6px;border-radius:50%;background:var(--teal);flex-shrink:0;margin-top:5px;}

  .submit-row{display:flex;justify-content:center;padding-top:8px;}
  .btn-submit{padding:16px 48px;background:var(--teal);color:#fff;border:none;border-radius:10px;font-family:'DM Serif Display',serif;font-size:1.1rem;cursor:pointer;box-shadow:0 4px 16px rgba(26,122,110,.35);transition:all .2s;letter-spacing:.02em;}
  .btn-submit:hover{background:var(--teal-dk);transform:translateY(-1px);box-shadow:0 6px 20px rgba(26,122,110,.4);}
  .btn-submit:disabled{opacity:.6;cursor:not-allowed;transform:none;}
  .success{text-align:center;padding:48px 24px;}
  .success-icon{font-size:4rem;margin-bottom:16px;}
  .success h2{color:var(--teal-dk);margin-bottom:8px;}
  .success p{color:var(--muted);margin-bottom:4px;}
  .protocol{font-family:monospace;background:var(--teal-lt);color:var(--teal-dk);padding:8px 20px;border-radius:8px;display:inline-block;margin:16px 0;font-size:.95rem;font-weight:700;letter-spacing:.06em;}
  .btn-dl{padding:12px 32px;background:var(--accent);color:#fff;border:none;border-radius:8px;cursor:pointer;font-family:'DM Sans',sans-serif;font-weight:600;font-size:.95rem;margin-top:8px;}
  .btn-dl:hover{opacity:.9;}
  .btn-new{padding:10px 24px;background:none;border:1.5px solid var(--teal);color:var(--teal);border-radius:8px;cursor:pointer;font-family:'DM Sans',sans-serif;font-weight:600;margin-top:8px;margin-left:8px;}
  .alert{background:#FFF8E1;border:1.5px solid #FFD54F;border-radius:8px;padding:12px 16px;font-size:.85rem;color:#7B5800;display:flex;align-items:center;gap:8px;}
  .loading{display:inline-block;width:18px;height:18px;border:2px solid rgba(255,255,255,.4);border-top-color:#fff;border-radius:50%;animation:spin .7s linear infinite;vertical-align:middle;margin-right:8px;}
  @keyframes spin{to{transform:rotate(360deg)}}
`;

// ── Utilities ─────────────────────────────────────────────────────────────────
function Field({ label, children, error }) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
      {error && <span className="errmsg">⚠ {error}</span>}
    </div>
  );
}
function TipoSelector({ value, onChange }) {
  return (
    <div className="tipo-group">
      {["LOCATÁRIO","FIADOR"].map(t=>(
        <button key={t} type="button" className={`tipo-btn${value===t?" sel":""}`} onClick={()=>onChange(t)}>{t}</button>
      ))}
    </div>
  );
}
const UF_LIST=["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];
function UFSelect({ value, onChange }) {
  return <select value={value} onChange={e=>onChange(e.target.value)}><option value="">UF</option>{UF_LIST.map(u=><option key={u}>{u}</option>)}</select>;
}
function CardSection({ icon, title, children }) {
  return (
    <div className="card">
      <div className="card-header"><span className="icon">{icon}</span><h3>{title}</h3></div>
      <div className="card-body">{children}</div>
    </div>
  );
}
function fileIcon(name="") {
  const ext=name.split(".").pop().toLowerCase();
  if(["jpg","jpeg","png","gif","webp"].includes(ext)) return "🖼️";
  if(ext==="pdf") return "📕";
  if(["doc","docx"].includes(ext)) return "📝";
  if(["xls","xlsx"].includes(ext)) return "📊";
  return "📎";
}

// ── DocUploadItem ─────────────────────────────────────────────────────────────
function DocUploadItem({ label, index, checked, files, onToggle, onFilesAdd, onFileRemove }) {
  const inputRef = useRef();
  const [drag, setDrag] = useState(false);

  const handleFiles = (fileList) => {
    const arr = Array.from(fileList).filter(f=>f.size<20*1024*1024);
    if(arr.length) onFilesAdd(arr);
  };

  return (
    <div className={`doc-item${checked?" checked":""}`}>
      <div className="doc-row" onClick={onToggle}>
        <input
          type="checkbox" className="doc-cb" checked={checked}
          onChange={onToggle} onClick={e=>e.stopPropagation()}
        />
        <span className="doc-label">{index+1}. {label}</span>
        {checked && (
          <span className={`doc-badge ${files.length>0?"ok":"empty"}`}>
            {files.length>0 ? `${files.length} arquivo${files.length>1?"s":""}` : "Sem anexo"}
          </span>
        )}
      </div>

      {checked && (
        <div className="upload-zone">
          <div
            className={`drop-area${drag?" drag":""}`}
            onDragOver={e=>{e.preventDefault();setDrag(true);}}
            onDragLeave={()=>setDrag(false)}
            onDrop={e=>{e.preventDefault();setDrag(false);handleFiles(e.dataTransfer.files);}}
            onClick={()=>inputRef.current?.click()}
          >
            <input
              ref={inputRef} type="file" multiple
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp,.xls,.xlsx"
              style={{display:"none"}}
              onChange={e=>{handleFiles(e.target.files);e.target.value="";}}
            />
            <div className="drop-text">
              📂 <strong>Clique para selecionar</strong> ou arraste os arquivos aqui<br/>
              <span style={{fontSize:".73rem"}}>PDF, Word, Excel, Imagens · Máx. 20 MB por arquivo</span>
            </div>
          </div>
          {files.length>0 && (
            <div className="file-chips">
              {files.map((f,i)=>(
                <div key={i} className="chip" title={f.name}>
                  <span className="chip-icon">{fileIcon(f.name)}</span>
                  <span className="chip-name">{f.name}</span>
                  <span className="chip-size">{fmtBytes(f.size)}</span>
                  <button className="chip-rm" type="button"
                    onClick={e=>{e.stopPropagation();onFileRemove(i);}}>✕</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── useDocState ───────────────────────────────────────────────────────────────
function useDocState(labels) {
  const [state, setState] = useState(()=>labels.map(()=>({checked:false,files:[]})));
  const toggle    = (i)    => setState(s=>s.map((d,j)=>j===i?{...d,checked:!d.checked,files:d.checked?[]:d.files}:d));
  const addFiles  = (i,fs) => setState(s=>s.map((d,j)=>j===i?{...d,files:[...d.files,...fs]}:d));
  const removeFile= (i,fi) => setState(s=>s.map((d,j)=>j===i?{...d,files:d.files.filter((_,k)=>k!==fi)}:d));
  const totalFiles = state.reduce((a,d)=>a+d.files.length,0);
  const allFiles   = state.flatMap((d,i)=>d.files.map(f=>({file:f,doc:labels[i]})));
  return { state, toggle, addFiles, removeFile, totalFiles, allFiles };
}

function AttachSummary({ allFiles }) {
  if(!allFiles.length) return null;
  return (
    <div className="attach-summary">
      <h4>📎 {allFiles.length} arquivo{allFiles.length>1?"s":""} anexado{allFiles.length>1?"s":""} ao envio</h4>
      {allFiles.map((a,i)=>(
        <div key={i} className="attach-row">
          <span className="dot"/>
          <span>{fileIcon(a.file.name)} <strong>{a.file.name}</strong> <span style={{color:"var(--muted)"}}>— {a.doc}</span> ({fmtBytes(a.file.size)})</span>
        </div>
      ))}
    </div>
  );
}

// ── Dynamic list factories ────────────────────────────────────────────────────
const newSocio    = ()=>({id:uid(),nome:"",cpf:"",pct:"",tel:""});
const newBemSocio = ()=>({id:uid(),end:"",cidade:"",valor:"",reg:""});
const newRefBanc  = ()=>({id:uid(),nome:"",tel:""});
const newRefCom   = ()=>({id:uid(),nome:"",tel:""});
const newBemPF    = ()=>({id:uid(),tipo:"",cidade:"",valor:""});
const newVeiculo  = ()=>({id:uid(),veiculo:"",ano:"",placa:"",valor:"",obs:""});
const newRefBancPF= ()=>({id:uid(),banco:"",agencia:"",conta:"",tel:""});
const newRefPes   = ()=>({id:uid(),nome:"",tel:""});

// ── PESSOA JURÍDICA ───────────────────────────────────────────────────────────
const DOCS_PJ=[
  "CONTRATO SOCIAL E A ÚLTIMA ALTERAÇÃO CONTRATUAL",
  "CARTÃO DO CNPJ",
  "ÚLTIMO BALANÇO E 02 ÚLTIMOS BALANCETES",
  "ÚLTIMA DECLARAÇÃO DE IMPOSTOS DE RENDA E RECIBOS",
  "SE PRESTADORA DE SERVIÇOS, 03 ÚLTIMOS RECIBOS DE ISS",
  "SE POSSUIR VEÍCULOS, COMPROVANTES",
  "APRESENTAR OS 06 ÚLTIMOS RECIBOS DE ALUGUEL",
];

function FormPJ({onSuccess}) {
  const [f,setF]=useState({
    tipo:"LOCATÁRIO",imovel:"",aluguel:"",razaoSocial:"",cnpj:"",ramoAtividade:"",
    inscEstadual:"",endereco:"",cidade:"",uf:"",cep:"",tel:"",contato:"",email:"",
    capitalInicial:"",fundadaEm:"",capitalAnual:"",registradaSob:"",data:"",
    houveAlteracao:"NAO",altNum:"",altData:"",nomeContador:"",telContador:"",
    filialA:"",filialB:"",
    socios:[newSocio()],bens:[newBemSocio()],
    refBancarias:[newRefBanc()],refComerciais:[newRefCom()],
    localData:"",dataAssinatura:"",aceite:false,
  });
  const docs=useDocState(DOCS_PJ);
  const [errs,setErrs]=useState({});
  const [sending,setSending]=useState(false);

  const upd=(k,v)=>setF(p=>({...p,[k]:v}));
  const updList=(key,id,field,val)=>setF(p=>({...p,[key]:p[key].map(r=>r.id===id?{...r,[field]:val}:r)}));
  const addRow=(key,fac)=>setF(p=>({...p,[key]:[...p[key],fac()]}));
  const rmRow=(key,id)=>setF(p=>({...p,[key]:p[key].filter(r=>r.id!==id)}));

  const validate=()=>{
    const e={};
    if(!f.razaoSocial) e.razaoSocial="Obrigatório";
    if(!validCNPJ(f.cnpj)) e.cnpj="CNPJ inválido";
    if(f.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) e.email="E-mail inválido";
    f.socios.forEach((s,i)=>{if(s.cpf&&!validCPF(s.cpf)) e[`scpf${i}`]="CPF inválido";});
    if(!f.aceite) e.aceite="Confirme a assinatura";
    return e;
  };

  const buildReport=()=>`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Cadastro PJ</title>
<style>body{font-family:Arial,sans-serif;max-width:820px;margin:0 auto;padding:24px;color:#222}
h1{color:#1A7A6E}h2{color:#0F5049;border-bottom:2px solid #1A7A6E;padding-bottom:4px;margin-top:24px}
table{width:100%;border-collapse:collapse;margin:8px 0}td{padding:6px 8px;border:1px solid #ddd}
.lb{background:#f0f0f0;font-weight:bold;width:220px}.ok{color:#155724;font-weight:600}</style></head><body>
<h1>🏢 Ficha Cadastro Pessoa Jurídica</h1>
<h2>Identificação</h2><table>
<tr><td class="lb">Tipo</td><td>${f.tipo}</td></tr>
<tr><td class="lb">Imóvel</td><td>${f.imovel}</td></tr>
<tr><td class="lb">Aluguel</td><td>${f.aluguel}</td></tr>
<tr><td class="lb">Razão Social</td><td>${f.razaoSocial}</td></tr>
<tr><td class="lb">CNPJ</td><td>${f.cnpj}</td></tr>
<tr><td class="lb">Ramo de Atividade</td><td>${f.ramoAtividade}</td></tr>
<tr><td class="lb">Insc. Estadual</td><td>${f.inscEstadual}</td></tr></table>
<h2>Endereço</h2><table>
<tr><td class="lb">Endereço</td><td>${f.endereco}</td></tr>
<tr><td class="lb">Cidade/UF/CEP</td><td>${f.cidade} — ${f.uf} — ${f.cep}</td></tr>
<tr><td class="lb">Telefone</td><td>${f.tel}</td></tr>
<tr><td class="lb">Contato / E-mail</td><td>${f.contato} / ${f.email}</td></tr></table>
<h2>Dados Financeiros</h2><table>
<tr><td class="lb">Capital Inicial</td><td>${f.capitalInicial}</td></tr>
<tr><td class="lb">Fundada em</td><td>${fmtDate(f.fundadaEm)}</td></tr>
<tr><td class="lb">Capital Anual</td><td>${f.capitalAnual}</td></tr>
<tr><td class="lb">Registrada sob Nº</td><td>${f.registradaSob}</td></tr>
<tr><td class="lb">Alteração Contratual</td><td>${f.houveAlteracao==="SIM"?`SIM — Nº ${f.altNum} em ${fmtDate(f.altData)}`:"NÃO"}</td></tr></table>
<h2>Sócios</h2><table><tr><th>Nome</th><th>CPF</th><th>%</th><th>Telefone</th></tr>
${f.socios.map(s=>`<tr><td>${s.nome}</td><td>${s.cpf}</td><td>${s.pct}%</td><td>${s.tel}</td></tr>`).join("")}</table>
<h2>Documentação Exigida</h2>
${DOCS_PJ.map((d,i)=>`<p style="margin:6px 0">${docs.state[i].checked?"✅":"☐"} ${d}${docs.state[i].files.length>0?` <span class="ok">(${docs.state[i].files.length} arquivo${docs.state[i].files.length>1?"s":""} anexado${docs.state[i].files.length>1?"s":""})</span>`:""}</p>`).join("")}
<h2>Arquivos Anexados (${docs.allFiles.length})</h2>
${docs.allFiles.length>0?docs.allFiles.map(a=>`<p>📎 <strong>${a.file.name}</strong> — <em>${a.doc}</em> (${fmtBytes(a.file.size)})</p>`).join(""):"<p>Nenhum arquivo anexado.</p>"}
<p style="margin-top:28px"><strong>Local/Data:</strong> ${f.localData} &nbsp;&nbsp; <strong>Assinatura confirmada:</strong> ${f.aceite?"Sim":"Não"}</p>
</body></html>`;

  const handleSubmit=async()=>{
    const e=validate(); setErrs(e);
    if(Object.keys(e).length) return;
    setSending(true);
    const protocol=uid().toUpperCase().slice(0,8);
    try {
      await fetch("https://api.anthropic.com/v1/messages",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:100,
          messages:[{role:"user",content:`Protocolo PJ: ${protocol}`}]})
      });
    } catch {}
    setSending(false);
    onSuccess({protocol,reportHtml:buildReport(),tipo:"Pessoa Jurídica",nome:f.razaoSocial,attachments:docs.allFiles});
  };

  return (
    <div>
      <CardSection icon="🏢" title="Tipo de Cadastro e Imóvel">
        <div className="grid g2" style={{gap:16}}>
          <Field label="Tipo"><TipoSelector value={f.tipo} onChange={v=>upd("tipo",v)}/></Field>
          <Field label="Imóvel"><input value={f.imovel} onChange={e=>upd("imovel",e.target.value)}/></Field>
          <Field label="Aluguel (R$)"><input value={f.aluguel} onChange={e=>upd("aluguel",maskMoney(e.target.value))}/></Field>
        </div>
      </CardSection>
      <CardSection icon="📋" title="Dados da Empresa">
        <div className="grid g2" style={{gap:16}}>
          <Field label="Razão Social" error={errs.razaoSocial}><input className={errs.razaoSocial?"err":""} value={f.razaoSocial} onChange={e=>upd("razaoSocial",e.target.value)}/></Field>
          <Field label="CNPJ" error={errs.cnpj}><input className={errs.cnpj?"err":""} value={f.cnpj} onChange={e=>upd("cnpj",maskCNPJ(e.target.value))} placeholder="00.000.000/0000-00"/></Field>
          <Field label="Ramo de Atividade"><input value={f.ramoAtividade} onChange={e=>upd("ramoAtividade",e.target.value)}/></Field>
          <Field label="Insc. Estadual"><input value={f.inscEstadual} onChange={e=>upd("inscEstadual",e.target.value)}/></Field>
          <Field label="E-mail" error={errs.email}><input type="email" className={errs.email?"err":""} value={f.email} onChange={e=>upd("email",e.target.value)}/></Field>
          <Field label="Contato"><input value={f.contato} onChange={e=>upd("contato",e.target.value)}/></Field>
        </div>
      </CardSection>
      <CardSection icon="📍" title="Endereço">
        <div className="grid g2" style={{gap:16}}>
          <div style={{gridColumn:"1/-1"}}><Field label="Endereço"><input value={f.endereco} onChange={e=>upd("endereco",e.target.value)}/></Field></div>
          <Field label="Cidade"><input value={f.cidade} onChange={e=>upd("cidade",e.target.value)}/></Field>
          <Field label="UF"><UFSelect value={f.uf} onChange={v=>upd("uf",v)}/></Field>
          <Field label="CEP"><input value={f.cep} onChange={e=>upd("cep",maskCEP(e.target.value))} placeholder="00000-000"/></Field>
          <Field label="Telefone"><input value={f.tel} onChange={e=>upd("tel",maskPhone(e.target.value))}/></Field>
        </div>
      </CardSection>
      <CardSection icon="💰" title="Dados Financeiros e Jurídicos">
        <div className="grid g2" style={{gap:16}}>
          <Field label="Capital Inicial"><input value={f.capitalInicial} onChange={e=>upd("capitalInicial",maskMoney(e.target.value))}/></Field>
          <Field label="Fundada em"><input type="date" value={f.fundadaEm} onChange={e=>upd("fundadaEm",e.target.value)}/></Field>
          <Field label="Capital Anual"><input value={f.capitalAnual} onChange={e=>upd("capitalAnual",maskMoney(e.target.value))}/></Field>
          <Field label="Registrada sob Nº"><input value={f.registradaSob} onChange={e=>upd("registradaSob",e.target.value)}/></Field>
          <Field label="Data"><input type="date" value={f.data} onChange={e=>upd("data",e.target.value)}/></Field>
          <Field label="Houve Alteração Contratual?">
            <select value={f.houveAlteracao} onChange={e=>upd("houveAlteracao",e.target.value)}>
              <option value="NAO">Não</option><option value="SIM">Sim</option>
            </select>
          </Field>
          {f.houveAlteracao==="SIM"&&<>
            <Field label="Nº Alteração"><input value={f.altNum} onChange={e=>upd("altNum",e.target.value)}/></Field>
            <Field label="Data Alteração"><input type="date" value={f.altData} onChange={e=>upd("altData",e.target.value)}/></Field>
          </>}
        </div>
      </CardSection>
      <CardSection icon="🧮" title="Contador">
        <div className="grid g2" style={{gap:16}}>
          <Field label="Nome do Contador"><input value={f.nomeContador} onChange={e=>upd("nomeContador",e.target.value)}/></Field>
          <Field label="Telefone"><input value={f.telContador} onChange={e=>upd("telContador",maskPhone(e.target.value))}/></Field>
        </div>
      </CardSection>
      <CardSection icon="🏬" title="Filiais e Outros Departamentos">
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <Field label="A) Endereço Completo"><textarea value={f.filialA} onChange={e=>upd("filialA",e.target.value)} rows={2}/></Field>
          <Field label="B) Endereço Completo"><textarea value={f.filialB} onChange={e=>upd("filialB",e.target.value)} rows={2}/></Field>
        </div>
      </CardSection>
      <CardSection icon="👥" title="Sócios">
        {f.socios.map((s,i)=>(
          <div key={s.id} className="dyn-row" style={{gridTemplateColumns:"2fr 1.5fr .7fr 1.3fr auto"}}>
            <Field label="Nome"><input value={s.nome} onChange={e=>updList("socios",s.id,"nome",e.target.value)}/></Field>
            <Field label="CPF" error={errs[`scpf${i}`]}><input className={errs[`scpf${i}`]?"err":""} value={s.cpf} onChange={e=>updList("socios",s.id,"cpf",maskCPF(e.target.value))} placeholder="000.000.000-00"/></Field>
            <Field label="%"><input type="number" value={s.pct} onChange={e=>updList("socios",s.id,"pct",e.target.value)}/></Field>
            <Field label="Telefone"><input value={s.tel} onChange={e=>updList("socios",s.id,"tel",maskPhone(e.target.value))}/></Field>
            <div style={{paddingBottom:5}}>{f.socios.length>1&&<button className="btn-rm" type="button" onClick={()=>rmRow("socios",s.id)}>✕</button>}</div>
          </div>
        ))}
        <button className="btn-add" type="button" onClick={()=>addRow("socios",newSocio)}>+ Adicionar Sócio</button>
      </CardSection>
      <CardSection icon="🏠" title="Bens / Imóveis dos Sócios">
        {f.bens.map(b=>(
          <div key={b.id} className="dyn-row" style={{gridTemplateColumns:"2fr 1.5fr 1fr 1fr auto"}}>
            <Field label="Endereço"><input value={b.end} onChange={e=>updList("bens",b.id,"end",e.target.value)}/></Field>
            <Field label="Cidade"><input value={b.cidade} onChange={e=>updList("bens",b.id,"cidade",e.target.value)}/></Field>
            <Field label="Valor"><input value={b.valor} onChange={e=>updList("bens",b.id,"valor",maskMoney(e.target.value))}/></Field>
            <Field label="Nº Registro"><input value={b.reg} onChange={e=>updList("bens",b.id,"reg",e.target.value)}/></Field>
            <div style={{paddingBottom:5}}>{f.bens.length>1&&<button className="btn-rm" type="button" onClick={()=>rmRow("bens",b.id)}>✕</button>}</div>
          </div>
        ))}
        <button className="btn-add" type="button" onClick={()=>addRow("bens",newBemSocio)}>+ Adicionar Bem</button>
      </CardSection>
      <CardSection icon="🏦" title="Referências Bancárias">
        {f.refBancarias.map(r=>(
          <div key={r.id} className="dyn-row" style={{gridTemplateColumns:"2fr 1.5fr auto"}}>
            <Field label="Nome/Instituição"><input value={r.nome} onChange={e=>updList("refBancarias",r.id,"nome",e.target.value)}/></Field>
            <Field label="Telefone"><input value={r.tel} onChange={e=>updList("refBancarias",r.id,"tel",maskPhone(e.target.value))}/></Field>
            <div style={{paddingBottom:5}}>{f.refBancarias.length>1&&<button className="btn-rm" type="button" onClick={()=>rmRow("refBancarias",r.id)}>✕</button>}</div>
          </div>
        ))}
        <button className="btn-add" type="button" onClick={()=>addRow("refBancarias",newRefBanc)}>+ Adicionar</button>
      </CardSection>
      <CardSection icon="🤝" title="Referências Comerciais / Fornecedores">
        {f.refComerciais.map(r=>(
          <div key={r.id} className="dyn-row" style={{gridTemplateColumns:"2fr 1.5fr auto"}}>
            <Field label="Nome"><input value={r.nome} onChange={e=>updList("refComerciais",r.id,"nome",e.target.value)}/></Field>
            <Field label="Telefone"><input value={r.tel} onChange={e=>updList("refComerciais",r.id,"tel",maskPhone(e.target.value))}/></Field>
            <div style={{paddingBottom:5}}>{f.refComerciais.length>1&&<button className="btn-rm" type="button" onClick={()=>rmRow("refComerciais",r.id)}>✕</button>}</div>
          </div>
        ))}
        <button className="btn-add" type="button" onClick={()=>addRow("refComerciais",newRefCom)}>+ Adicionar</button>
      </CardSection>

      {/* ── DOCUMENTAÇÃO COM UPLOAD ── */}
      <CardSection icon="📄" title="Documentação Exigida — Marque e Anexe os Arquivos">
        <p style={{fontSize:".85rem",color:"var(--muted)",marginBottom:16}}>
          Marque cada documento disponível. Ao marcar, um campo para <strong>anexar o arquivo</strong> será exibido — clique para selecionar ou arraste o arquivo.
        </p>
        <div className="doc-list">
          {DOCS_PJ.map((label,i)=>(
            <DocUploadItem key={i} index={i} label={label}
              checked={docs.state[i].checked} files={docs.state[i].files}
              onToggle={()=>docs.toggle(i)}
              onFilesAdd={fs=>docs.addFiles(i,fs)}
              onFileRemove={fi=>docs.removeFile(i,fi)}
            />
          ))}
        </div>
        <AttachSummary allFiles={docs.allFiles}/>
      </CardSection>

      <CardSection icon="✍️" title="Local, Data e Assinatura">
        <div className="grid g2" style={{gap:16}}>
          <Field label="Local e Data"><input value={f.localData} onChange={e=>upd("localData",e.target.value)} placeholder="Cidade, DD/MM/AAAA"/></Field>
          <Field label="Data"><input type="date" value={f.dataAssinatura} onChange={e=>upd("dataAssinatura",e.target.value)}/></Field>
        </div>
        <div style={{marginTop:16}}>
          <label className="check-item">
            <input type="checkbox" checked={f.aceite} onChange={e=>upd("aceite",e.target.checked)}/>
            <span>Declaro que as informações prestadas são verdadeiras e assumo responsabilidade pelo seu conteúdo. (Carimbo e Assinatura)</span>
          </label>
          {errs.aceite&&<span style={{display:"block",marginTop:6,fontSize:".75rem",color:"var(--err)"}}>⚠ {errs.aceite}</span>}
        </div>
      </CardSection>

      <div className="submit-row">
        <button className="btn-submit" type="button" onClick={handleSubmit} disabled={sending}>
          {sending&&<span className="loading"/>}
          {sending?`Enviando${docs.totalFiles>0?` (${docs.totalFiles} arquivo${docs.totalFiles>1?"s":""})…`:"…"}`:"Enviar Cadastro"}
        </button>
      </div>
    </div>
  );
}

// ── PESSOA FÍSICA ─────────────────────────────────────────────────────────────
const DOCS_PF=[
  "CARTEIRA DE IDENTIDADE E CPF DO CASAL",
  "03 ÚLTIMOS COMPROVANTES DE RENDA LÍQUIDA DO CASAL / IR – 3 VEZES VALOR DO ALUGUEL",
  "CERTIFICADO DE CASAMENTO/SEPARAÇÃO/ÓBITO (CÔNJUGE)",
  "COMPROVANTE DE ENDEREÇO RESIDENCIAL (CONTA DE LUZ, ÁGUA, TELEFONE)",
  "CONTRATO SOCIAL/ÚLTIMA ALTERAÇÃO (PARA OS SÓCIOS DE EMPRESAS)",
  "IPTU E REGISTRO DE IMÓVEL EM BH (QUITADOS E ATUALIZADOS)",
  "APRESENTAR 06 ÚLTIMOS RECIBOS DE PAGAMENTO DE ALUGUEL",
];

function FormPF({onSuccess}) {
  const [f,setF]=useState({
    tipo:"LOCATÁRIO",endImovel:"",aluguel:"",solicitante:"",solTel:"",
    objetivoComercial:false,atividadeComercial:"",
    objetivoResidencial:false,moradores:"",
    nomeCompleto:"",cpf:"",endResidencial:"",bairro:"",cep:"",cidade:"",uf:"",
    profissao:"",tel:"",cel:"",email:"",nacionalidade:"",naturalDe:"",naturalUF:"",
    dataNasc:"",rg:"",expedidaEm:"",orgaoExpedidor:"",estadoCivil:"",regimeCasamento:"",
    nDependentes:"",residePropia:"NAO",comParentes:"",pagaAluguel:"NAO",
    valorAluguel:"",imobiliariaEnd:"",ultimaCidade:"",tempoNaCidade:"",mae:"",pai:"",endPais:"",telPais:"",
    empresa:"",empresaEnd:"",empresaTel:"",dataAdmissao:"",cargo:"",salario:"",
    outrosRendimentos:"NAO",rendOrigem:"",rendValor:"",
    conjNome:"",conjCpf:"",conjProfissao:"",conjNasc:"",conjRg:"",conjTel:"",conjCel:"",conjEmail:"",
    conjEmpresa:"",conjEmpTel:"",conjEmpEnd:"",conjEmpBairro:"",conjEmpCidade:"",conjAdmissao:"",conjCargo:"",conjSalario:"",
    bensImoveis:[newBemPF()],veiculos:[newVeiculo()],
    refBancarias:[newRefBancPF()],refPessoais:[newRefPes()],
    dataAssinatura:"",aceite:false,
  });
  const docs=useDocState(DOCS_PF);
  const [errs,setErrs]=useState({});
  const [sending,setSending]=useState(false);

  const upd=(k,v)=>setF(p=>({...p,[k]:v}));
  const updList=(key,id,field,val)=>setF(p=>({...p,[key]:p[key].map(r=>r.id===id?{...r,[field]:val}:r)}));
  const addRow=(key,fac)=>setF(p=>({...p,[key]:[...p[key],fac()]}));
  const rmRow=(key,id)=>setF(p=>({...p,[key]:p[key].filter(r=>r.id!==id)}));

  const validate=()=>{
    const e={};
    if(!f.nomeCompleto) e.nomeCompleto="Obrigatório";
    if(!validCPF(f.cpf)) e.cpf="CPF inválido";
    if(f.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) e.email="E-mail inválido";
    if(!f.aceite) e.aceite="Confirme o aceite";
    return e;
  };

  const buildReport=()=>`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Cadastro PF</title>
<style>body{font-family:Arial,sans-serif;max-width:820px;margin:0 auto;padding:24px;color:#222}
h1{color:#1A7A6E}h2{color:#0F5049;border-bottom:2px solid #1A7A6E;padding-bottom:4px;margin-top:24px}
table{width:100%;border-collapse:collapse;margin:8px 0}td{padding:6px 8px;border:1px solid #ddd}
.lb{background:#f0f0f0;font-weight:bold;width:220px}.ok{color:#155724;font-weight:600}</style></head><body>
<h1>👤 Ficha Cadastro Pessoa Física</h1>
<h2>Identificação</h2><table>
<tr><td class="lb">Tipo</td><td>${f.tipo}</td></tr>
<tr><td class="lb">Endereço do Imóvel</td><td>${f.endImovel}</td></tr>
<tr><td class="lb">Aluguel</td><td>${f.aluguel}</td></tr></table>
<h2>Dados Pessoais</h2><table>
<tr><td class="lb">Nome Completo</td><td>${f.nomeCompleto}</td></tr>
<tr><td class="lb">CPF</td><td>${f.cpf}</td></tr>
<tr><td class="lb">RG</td><td>${f.rg} — ${f.orgaoExpedidor}</td></tr>
<tr><td class="lb">Data de Nasc.</td><td>${fmtDate(f.dataNasc)}</td></tr>
<tr><td class="lb">Estado Civil</td><td>${f.estadoCivil}</td></tr>
<tr><td class="lb">Profissão</td><td>${f.profissao}</td></tr>
<tr><td class="lb">E-mail</td><td>${f.email}</td></tr></table>
<h2>Atividade / Rendimentos</h2><table>
<tr><td class="lb">Empresa</td><td>${f.empresa}</td></tr>
<tr><td class="lb">Cargo / Salário</td><td>${f.cargo} / ${f.salario}</td></tr></table>
<h2>Documentação Exigida</h2>
${DOCS_PF.map((d,i)=>`<p style="margin:6px 0">${docs.state[i].checked?"✅":"☐"} ${d}${docs.state[i].files.length>0?` <span class="ok">(${docs.state[i].files.length} arquivo${docs.state[i].files.length>1?"s":""} anexado${docs.state[i].files.length>1?"s":""})</span>`:""}</p>`).join("")}
<h2>Arquivos Anexados (${docs.allFiles.length})</h2>
${docs.allFiles.length>0?docs.allFiles.map(a=>`<p>📎 <strong>${a.file.name}</strong> — <em>${a.doc}</em> (${fmtBytes(a.file.size)})</p>`).join(""):"<p>Nenhum arquivo anexado.</p>"}
<p style="margin-top:28px"><strong>Assinatura confirmada:</strong> ${f.aceite?"Sim":"Não"}</p>
</body></html>`;

  const handleSubmit=async()=>{
    const e=validate(); setErrs(e);
    if(Object.keys(e).length) return;
    setSending(true);
    const protocol=uid().toUpperCase().slice(0,8);
    try {
      await fetch("https://api.anthropic.com/v1/messages",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:100,
          messages:[{role:"user",content:`Protocolo PF: ${protocol}`}]})
      });
    } catch {}
    setSending(false);
    onSuccess({protocol,reportHtml:buildReport(),tipo:"Pessoa Física",nome:f.nomeCompleto,attachments:docs.allFiles});
  };

  return (
    <div>
      <CardSection icon="👤" title="Tipo de Cadastro e Imóvel">
        <div className="grid g2" style={{gap:16}}>
          <Field label="Tipo"><TipoSelector value={f.tipo} onChange={v=>upd("tipo",v)}/></Field>
          <Field label="Endereço do Imóvel"><input value={f.endImovel} onChange={e=>upd("endImovel",e.target.value)}/></Field>
          <Field label="Aluguel (R$)"><input value={f.aluguel} onChange={e=>upd("aluguel",maskMoney(e.target.value))}/></Field>
          <Field label="Solicitante"><input value={f.solicitante} onChange={e=>upd("solicitante",e.target.value)}/></Field>
          <Field label="Tel. Solicitante"><input value={f.solTel} onChange={e=>upd("solTel",maskPhone(e.target.value))}/></Field>
        </div>
      </CardSection>
      <CardSection icon="🎯" title="Objetivo da Locação">
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <label className="check-item"><input type="checkbox" checked={f.objetivoComercial} onChange={e=>upd("objetivoComercial",e.target.checked)}/><span>Comercial</span></label>
          {f.objetivoComercial&&<Field label="Atividade Comercial"><input value={f.atividadeComercial} onChange={e=>upd("atividadeComercial",e.target.value)}/></Field>}
          <label className="check-item"><input type="checkbox" checked={f.objetivoResidencial} onChange={e=>upd("objetivoResidencial",e.target.checked)}/><span>Residencial</span></label>
          {f.objetivoResidencial&&<Field label="Relacionar Moradores"><textarea value={f.moradores} onChange={e=>upd("moradores",e.target.value)} rows={3}/></Field>}
        </div>
      </CardSection>
      <CardSection icon="📋" title="Dados Pessoais">
        <div className="grid g2" style={{gap:16}}>
          <div style={{gridColumn:"1/-1"}}><Field label="Nome Completo" error={errs.nomeCompleto}><input className={errs.nomeCompleto?"err":""} value={f.nomeCompleto} onChange={e=>upd("nomeCompleto",e.target.value)}/></Field></div>
          <Field label="CPF" error={errs.cpf}><input className={errs.cpf?"err":""} value={f.cpf} onChange={e=>upd("cpf",maskCPF(e.target.value))} placeholder="000.000.000-00"/></Field>
          <Field label="RG"><input value={f.rg} onChange={e=>upd("rg",e.target.value)}/></Field>
          <Field label="Expedida em"><input type="date" value={f.expedidaEm} onChange={e=>upd("expedidaEm",e.target.value)}/></Field>
          <Field label="Órgão Expedidor"><input value={f.orgaoExpedidor} onChange={e=>upd("orgaoExpedidor",e.target.value)}/></Field>
          <Field label="Data de Nasc."><input type="date" value={f.dataNasc} onChange={e=>upd("dataNasc",e.target.value)}/></Field>
          <Field label="Nacionalidade"><input value={f.nacionalidade} onChange={e=>upd("nacionalidade",e.target.value)}/></Field>
          <Field label="Natural de"><input value={f.naturalDe} onChange={e=>upd("naturalDe",e.target.value)}/></Field>
          <Field label="UF Natural"><UFSelect value={f.naturalUF} onChange={v=>upd("naturalUF",v)}/></Field>
          <Field label="Estado Civil"><input value={f.estadoCivil} onChange={e=>upd("estadoCivil",e.target.value)}/></Field>
          <Field label="Regime de Casamento"><input value={f.regimeCasamento} onChange={e=>upd("regimeCasamento",e.target.value)}/></Field>
          <Field label="Nº de Dependentes"><input type="number" min="0" value={f.nDependentes} onChange={e=>upd("nDependentes",e.target.value)}/></Field>
          <Field label="Profissão"><input value={f.profissao} onChange={e=>upd("profissao",e.target.value)}/></Field>
          <Field label="E-mail" error={errs.email}><input type="email" className={errs.email?"err":""} value={f.email} onChange={e=>upd("email",e.target.value)}/></Field>
          <Field label="Telefone"><input value={f.tel} onChange={e=>upd("tel",maskPhone(e.target.value))}/></Field>
          <Field label="Celular"><input value={f.cel} onChange={e=>upd("cel",maskPhone(e.target.value))}/></Field>
        </div>
      </CardSection>
      <CardSection icon="📍" title="Endereço Residencial">
        <div className="grid g2" style={{gap:16}}>
          <div style={{gridColumn:"1/-1"}}><Field label="Endereço Residencial"><input value={f.endResidencial} onChange={e=>upd("endResidencial",e.target.value)}/></Field></div>
          <Field label="Bairro"><input value={f.bairro} onChange={e=>upd("bairro",e.target.value)}/></Field>
          <Field label="CEP"><input value={f.cep} onChange={e=>upd("cep",maskCEP(e.target.value))} placeholder="00000-000"/></Field>
          <Field label="Cidade"><input value={f.cidade} onChange={e=>upd("cidade",e.target.value)}/></Field>
          <Field label="UF"><UFSelect value={f.uf} onChange={v=>upd("uf",v)}/></Field>
          <Field label="Reside em Casa Própria?"><select value={f.residePropia} onChange={e=>upd("residePropia",e.target.value)}><option value="NAO">Não</option><option value="SIM">Sim</option></select></Field>
          <Field label="Com Parentes?"><input value={f.comParentes} onChange={e=>upd("comParentes",e.target.value)}/></Field>
          <Field label="Paga Aluguel?"><select value={f.pagaAluguel} onChange={e=>upd("pagaAluguel",e.target.value)}><option value="NAO">Não</option><option value="SIM">Sim</option></select></Field>
          {f.pagaAluguel==="SIM"&&<>
            <Field label="Valor do Aluguel"><input value={f.valorAluguel} onChange={e=>upd("valorAluguel",maskMoney(e.target.value))}/></Field>
            <div style={{gridColumn:"1/-1"}}><Field label="Imobiliária / Proprietário — Endereço e Tel."><input value={f.imobiliariaEnd} onChange={e=>upd("imobiliariaEnd",e.target.value)}/></Field></div>
          </>}
          <Field label="Última Cidade onde Residiu"><input value={f.ultimaCidade} onChange={e=>upd("ultimaCidade",e.target.value)}/></Field>
          <Field label="Há quanto tempo nessa cidade?"><input value={f.tempoNaCidade} onChange={e=>upd("tempoNaCidade",e.target.value)}/></Field>
        </div>
      </CardSection>
      <CardSection icon="👨‍👩‍👧" title="Filiação">
        <div className="grid g2" style={{gap:16}}>
          <Field label="Mãe"><input value={f.mae} onChange={e=>upd("mae",e.target.value)}/></Field>
          <Field label="Pai"><input value={f.pai} onChange={e=>upd("pai",e.target.value)}/></Field>
          <Field label="Endereço dos Pais"><input value={f.endPais} onChange={e=>upd("endPais",e.target.value)}/></Field>
          <Field label="Telefone dos Pais"><input value={f.telPais} onChange={e=>upd("telPais",maskPhone(e.target.value))}/></Field>
        </div>
      </CardSection>
      <CardSection icon="💼" title="Atividades / Rendimentos">
        <div className="grid g2" style={{gap:16}}>
          <div style={{gridColumn:"1/-1"}}><Field label="Empresa onde Trabalha"><input value={f.empresa} onChange={e=>upd("empresa",e.target.value)}/></Field></div>
          <Field label="Endereço"><input value={f.empresaEnd} onChange={e=>upd("empresaEnd",e.target.value)}/></Field>
          <Field label="Telefone"><input value={f.empresaTel} onChange={e=>upd("empresaTel",maskPhone(e.target.value))}/></Field>
          <Field label="Data de Admissão"><input type="date" value={f.dataAdmissao} onChange={e=>upd("dataAdmissao",e.target.value)}/></Field>
          <Field label="Cargo"><input value={f.cargo} onChange={e=>upd("cargo",e.target.value)}/></Field>
          <Field label="Salário Mensal"><input value={f.salario} onChange={e=>upd("salario",maskMoney(e.target.value))}/></Field>
          <Field label="Tem Outros Rendimentos?"><select value={f.outrosRendimentos} onChange={e=>upd("outrosRendimentos",e.target.value)}><option value="NAO">Não</option><option value="SIM">Sim</option></select></Field>
          {f.outrosRendimentos==="SIM"&&<>
            <Field label="Origem"><input value={f.rendOrigem} onChange={e=>upd("rendOrigem",e.target.value)}/></Field>
            <Field label="Valor"><input value={f.rendValor} onChange={e=>upd("rendValor",maskMoney(e.target.value))}/></Field>
          </>}
        </div>
      </CardSection>
      <CardSection icon="💍" title="Dados do Cônjuge">
        <div className="grid g2" style={{gap:16}}>
          <div style={{gridColumn:"1/-1"}}><Field label="Nome Completo do Cônjuge"><input value={f.conjNome} onChange={e=>upd("conjNome",e.target.value)}/></Field></div>
          <Field label="CPF"><input value={f.conjCpf} onChange={e=>upd("conjCpf",maskCPF(e.target.value))} placeholder="000.000.000-00"/></Field>
          <Field label="Profissão"><input value={f.conjProfissao} onChange={e=>upd("conjProfissao",e.target.value)}/></Field>
          <Field label="Data de Nasc."><input type="date" value={f.conjNasc} onChange={e=>upd("conjNasc",e.target.value)}/></Field>
          <Field label="RG"><input value={f.conjRg} onChange={e=>upd("conjRg",e.target.value)}/></Field>
          <Field label="Telefone"><input value={f.conjTel} onChange={e=>upd("conjTel",maskPhone(e.target.value))}/></Field>
          <Field label="Celular"><input value={f.conjCel} onChange={e=>upd("conjCel",maskPhone(e.target.value))}/></Field>
          <Field label="E-mail"><input type="email" value={f.conjEmail} onChange={e=>upd("conjEmail",e.target.value)}/></Field>
          <div style={{gridColumn:"1/-1"}}><Field label="Empresa do Cônjuge"><input value={f.conjEmpresa} onChange={e=>upd("conjEmpresa",e.target.value)}/></Field></div>
          <Field label="Endereço Empresa"><input value={f.conjEmpEnd} onChange={e=>upd("conjEmpEnd",e.target.value)}/></Field>
          <Field label="Bairro"><input value={f.conjEmpBairro} onChange={e=>upd("conjEmpBairro",e.target.value)}/></Field>
          <Field label="Cidade/UF"><input value={f.conjEmpCidade} onChange={e=>upd("conjEmpCidade",e.target.value)}/></Field>
          <Field label="Tel. Empresa"><input value={f.conjEmpTel} onChange={e=>upd("conjEmpTel",maskPhone(e.target.value))}/></Field>
          <Field label="Data de Admissão"><input type="date" value={f.conjAdmissao} onChange={e=>upd("conjAdmissao",e.target.value)}/></Field>
          <Field label="Cargo"><input value={f.conjCargo} onChange={e=>upd("conjCargo",e.target.value)}/></Field>
          <Field label="Salário Mensal"><input value={f.conjSalario} onChange={e=>upd("conjSalario",maskMoney(e.target.value))}/></Field>
        </div>
      </CardSection>
      <CardSection icon="🏠" title="Bens Imóveis">
        {f.bensImoveis.map(b=>(
          <div key={b.id} className="dyn-row" style={{gridTemplateColumns:"2fr 1.5fr 1fr auto"}}>
            <Field label="Tipo / Endereço"><input value={b.tipo} onChange={e=>updList("bensImoveis",b.id,"tipo",e.target.value)}/></Field>
            <Field label="Cidade / Estado"><input value={b.cidade} onChange={e=>updList("bensImoveis",b.id,"cidade",e.target.value)}/></Field>
            <Field label="Valor"><input value={b.valor} onChange={e=>updList("bensImoveis",b.id,"valor",maskMoney(e.target.value))}/></Field>
            <div style={{paddingBottom:5}}>{f.bensImoveis.length>1&&<button className="btn-rm" type="button" onClick={()=>rmRow("bensImoveis",b.id)}>✕</button>}</div>
          </div>
        ))}
        <button className="btn-add" type="button" onClick={()=>addRow("bensImoveis",newBemPF)}>+ Adicionar Bem</button>
      </CardSection>
      <CardSection icon="🚗" title="Veículos">
        {f.veiculos.map(v=>(
          <div key={v.id} className="dyn-row" style={{gridTemplateColumns:"2fr .7fr .8fr 1fr 1.5fr auto"}}>
            <Field label="Veículo"><input value={v.veiculo} onChange={e=>updList("veiculos",v.id,"veiculo",e.target.value)}/></Field>
            <Field label="Ano"><input type="number" value={v.ano} onChange={e=>updList("veiculos",v.id,"ano",e.target.value)}/></Field>
            <Field label="Placa"><input value={v.placa} onChange={e=>updList("veiculos",v.id,"placa",e.target.value.toUpperCase())}/></Field>
            <Field label="Valor Atual"><input value={v.valor} onChange={e=>updList("veiculos",v.id,"valor",maskMoney(e.target.value))}/></Field>
            <Field label="Observação"><input value={v.obs} onChange={e=>updList("veiculos",v.id,"obs",e.target.value)}/></Field>
            <div style={{paddingBottom:5}}>{f.veiculos.length>1&&<button className="btn-rm" type="button" onClick={()=>rmRow("veiculos",v.id)}>✕</button>}</div>
          </div>
        ))}
        <button className="btn-add" type="button" onClick={()=>addRow("veiculos",newVeiculo)}>+ Adicionar Veículo</button>
        <div className="alert" style={{marginTop:12}}>📎 ANEXAR CÓPIA DOS REGISTROS ATUALIZADOS COM IPTU DO ANO VIGENTE</div>
      </CardSection>
      <CardSection icon="🏦" title="Referências Bancárias (Conta Corrente)">
        {f.refBancarias.map(r=>(
          <div key={r.id} className="dyn-row" style={{gridTemplateColumns:"2fr 1fr 1fr 1.2fr auto"}}>
            <Field label="Banco"><input value={r.banco} onChange={e=>updList("refBancarias",r.id,"banco",e.target.value)}/></Field>
            <Field label="Agência"><input value={r.agencia} onChange={e=>updList("refBancarias",r.id,"agencia",e.target.value)}/></Field>
            <Field label="Nº Conta"><input value={r.conta} onChange={e=>updList("refBancarias",r.id,"conta",e.target.value)}/></Field>
            <Field label="Telefone"><input value={r.tel} onChange={e=>updList("refBancarias",r.id,"tel",maskPhone(e.target.value))}/></Field>
            <div style={{paddingBottom:5}}>{f.refBancarias.length>1&&<button className="btn-rm" type="button" onClick={()=>rmRow("refBancarias",r.id)}>✕</button>}</div>
          </div>
        ))}
        <button className="btn-add" type="button" onClick={()=>addRow("refBancarias",newRefBancPF)}>+ Adicionar</button>
      </CardSection>
      <CardSection icon="🤝" title="Referências Pessoais / Outras">
        {f.refPessoais.map(r=>(
          <div key={r.id} className="dyn-row" style={{gridTemplateColumns:"2fr 1.5fr auto"}}>
            <Field label="Nome"><input value={r.nome} onChange={e=>updList("refPessoais",r.id,"nome",e.target.value)}/></Field>
            <Field label="Telefone"><input value={r.tel} onChange={e=>updList("refPessoais",r.id,"tel",maskPhone(e.target.value))}/></Field>
            <div style={{paddingBottom:5}}>{f.refPessoais.length>1&&<button className="btn-rm" type="button" onClick={()=>rmRow("refPessoais",r.id)}>✕</button>}</div>
          </div>
        ))}
        <button className="btn-add" type="button" onClick={()=>addRow("refPessoais",newRefPes)}>+ Adicionar</button>
      </CardSection>

      {/* ── DOCUMENTAÇÃO COM UPLOAD ── */}
      <CardSection icon="📄" title="Documentação Exigida — Marque e Anexe os Arquivos">
        <p style={{fontSize:".85rem",color:"var(--muted)",marginBottom:16}}>
          Marque cada documento disponível. Ao marcar, um campo para <strong>anexar o arquivo</strong> será exibido — clique para selecionar ou arraste o arquivo.
        </p>
        <div className="doc-list">
          {DOCS_PF.map((label,i)=>(
            <DocUploadItem key={i} index={i} label={label}
              checked={docs.state[i].checked} files={docs.state[i].files}
              onToggle={()=>docs.toggle(i)}
              onFilesAdd={fs=>docs.addFiles(i,fs)}
              onFileRemove={fi=>docs.removeFile(i,fi)}
            />
          ))}
        </div>
        <AttachSummary allFiles={docs.allFiles}/>
      </CardSection>

      <CardSection icon="✍️" title="Assinatura e Aceite">
        <Field label="Data"><input type="date" value={f.dataAssinatura} onChange={e=>upd("dataAssinatura",e.target.value)}/></Field>
        <div style={{marginTop:16}}>
          <label className="check-item">
            <input type="checkbox" checked={f.aceite} onChange={e=>upd("aceite",e.target.checked)}/>
            <span>Declaro que as informações prestadas são verdadeiras e assumo responsabilidade pelo seu conteúdo. (Assinatura)</span>
          </label>
          {errs.aceite&&<span style={{display:"block",marginTop:6,fontSize:".75rem",color:"var(--err)"}}>⚠ {errs.aceite}</span>}
        </div>
      </CardSection>

      <div className="submit-row">
        <button className="btn-submit" type="button" onClick={handleSubmit} disabled={sending}>
          {sending&&<span className="loading"/>}
          {sending?`Enviando${docs.totalFiles>0?` (${docs.totalFiles} arquivo${docs.totalFiles>1?"s":""})…`:"…"}`:"Enviar Cadastro"}
        </button>
      </div>
    </div>
  );
}

// ── SUCCESS ───────────────────────────────────────────────────────────────────
function SuccessScreen({ data, onNew }) {
  const download=()=>{
    const blob=new Blob([data.reportHtml],{type:"text/html"});
    const a=document.createElement("a");
    a.href=URL.createObjectURL(blob); a.download=`cadastro-${data.protocol}.html`; a.click();
  };
  return (
    <div className="card">
      <div className="success">
        <div className="success-icon">✅</div>
        <h2>Cadastro Enviado com Sucesso!</h2>
        <p>O cadastro de <strong>{data.nome}</strong> ({data.tipo}) foi registrado.</p>
        <p>O relatório será enviado para <strong>contato@admbras.com.br</strong></p>
        {data.attachments.length>0&&(
          <p style={{marginTop:8,color:"var(--teal)",fontWeight:600}}>
            📎 {data.attachments.length} documento{data.attachments.length>1?"s":""} anexado{data.attachments.length>1?"s":""}
          </p>
        )}
        <div className="protocol">PROTOCOLO: {data.protocol}</div>
        {data.attachments.length>0&&(
          <div className="attach-summary" style={{textAlign:"left",maxWidth:500,margin:"0 auto 16px"}}>
            <h4>Documentos Anexados</h4>
            {data.attachments.map((a,i)=>(
              <div key={i} className="attach-row">
                <span className="dot"/>
                <span>{fileIcon(a.file.name)} <strong>{a.file.name}</strong> — <em style={{color:"var(--muted)"}}>{a.doc}</em> ({fmtBytes(a.file.size)})</span>
              </div>
            ))}
          </div>
        )}
        <br/>
        <button className="btn-dl" onClick={download}>⬇ Baixar Relatório HTML</button>
        <button className="btn-new" onClick={onNew}>Novo Cadastro</button>
      </div>
    </div>
  );
}

// ── APP ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [tab,setTab]=useState("PF");
  const [success,setSuccess]=useState(null);
  return (
    <>
      <style>{css}</style>
      <div className="app">
        <div className="header">
          <div className="logo-bar"><div className="logo-icon">🏡</div></div>
          <h1>Cadastro de Imóveis</h1>
          <p>ADM Bras — Sistema de Cadastro de Locatários e Fiadores</p>
        </div>
        {success ? (
          <SuccessScreen data={success} onNew={()=>setSuccess(null)}/>
        ) : (
          <>
            <div className="tabs">
              <button className={`tab${tab==="PF"?" active":""}`} onClick={()=>setTab("PF")}>👤 Pessoa Física</button>
              <button className={`tab${tab==="PJ"?" active":""}`} onClick={()=>setTab("PJ")}>🏢 Pessoa Jurídica</button>
            </div>
            {tab==="PF"?<FormPF onSuccess={setSuccess}/>:<FormPJ onSuccess={setSuccess}/>}
          </>
        )}
      </div>
    </>
  );
}