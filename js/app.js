// ===== helpers
const $$ = s => document.querySelector(s)
const $$$ = s => Array.from(document.querySelectorAll(s))
const toast = (m)=>{ const t=$$('#toast'); t.textContent=m; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'),1600) }
const sanitize = (str='') => String(str).replace(/[<>]/g, c => ({'<':'&lt;','>':'&gt;'}[c]))

function applyNavPad(){
  const nav=document.querySelector('nav'); if(!nav) return
  const h=(nav.offsetHeight||0)+12
  document.documentElement.style.setProperty('--navpad', h+'px')
}
window.addEventListener('resize', applyNavPad, { passive:true })
window.addEventListener('orientationchange', applyNavPad, { passive:true })
window.addEventListener('load', applyNavPad, { passive:true })
setTimeout(applyNavPad, 250)

function show(page){
  $$$('.page').forEach(x=>x.classList.remove('active'))
  $$('#'+page).classList.add('active')
  $$$('nav button').forEach(b=>b.classList.toggle('active', b.dataset.page===page))
  if(page==='lister') renderDashboard()
  if(page==='kontrollert') renderArchive()
  if(page==='kontroll') window.scrollTo({ top:0, behavior:'instant' })
}

// ===== Supabase
const { createClient } = window.supabase
const SUPABASE_URL = 'https://lztitjaumvqgycpcvvwl.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6dGl0amF1bXZxZ3ljcGN2dndsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyNjQ2NTEsImV4cCI6MjA3Nzg0MDY1MX0.ZDK2ymr5vYG3HP5-j-CRv3UAe5G-VKGIUOObbhd6cyU'
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

function showAuthError(err){ const box=$$('#auth-error'); if(!box) return; box.style.display='block'; box.textContent=(err?.message||'Ukjent feil') }
function clearAuthError(){ const box=$$('#auth-error'); if(!box) return; box.style.display='none'; box.textContent='' }

async function currentUser(){ const { data:{ user }} = await supabase.auth.getUser(); return user }

// ===== BRREG
const brregLog = $$('#brreg-log')
async function searchBrreg(){
  const n=$$('#orgnr').value.replace(/\D/g,'')
  if(n.length!==9){ brregLog.textContent='Org.nr må ha 9 siffer'; return }
  brregLog.textContent='Søker…'
  try{
    const r=await fetch(`https://data.brreg.no/enhetsregisteret/api/enheter/${n}`)
    if(!r.ok) throw new Error('Ikke funnet')
    const d=await r.json()
    const a=d.forretningsadresse||d.beliggenhetsadresse||{}
    $$('#besoks_postnr').value=a.postnummer||''
    $$('#besoks_poststed').value=a.poststed||''
    $$('#firma').value=d.navn||''
    brregLog.textContent='Hentet postadresse'
  }catch{ brregLog.textContent='Ikke funnet' }
}

// ===== TARIFFLINJER (per rad)
function defaultDays(venue, music){
  if(music==='Fremtredende') return 104
  return venue==='Serveringssted' ? 356 : 310
}

function rowTemplate(preset){
  const venue = preset?.venue || 'Serveringssted'
  const music = preset?.music || 'Bakgrunn'
  const kvm = preset?.kvm || ''
  const seter = preset?.seter || ''
  const dager = preset?.dager || defaultDays(venue, music)

  return `<div class="row tariff-row">
    <select class="venue">
      <option ${venue==='Serveringssted'?'selected':''}>Serveringssted</option>
      <option ${venue==='Kundelokale'?'selected':''}>Kundelokale</option>
    </select>
    <select class="music">
      <option ${music==='Bakgrunn'?'selected':''}>Bakgrunn</option>
      <option ${music==='Fremtredende'?'selected':''}>Fremtredende</option>
    </select>
    <input type="number" class="kvm" placeholder="kvm" value="${sanitize(kvm)}" style="max-width:110px">
    <input type="number" class="seter" placeholder="sitteplasser" value="${sanitize(seter)}" style="max-width:130px">
    <input type="number" class="dager" placeholder="dager/år" value="${sanitize(dager)}" style="max-width:110px">
    <button class="icon-btn" title="Fjern" onclick="this.closest('.tariff-row').remove()">−</button>
  </div>`
}

function attachRowLogic(row){
  const venueEl = row.querySelector('.venue')
  const musicEl = row.querySelector('.music')
  const seterEl = row.querySelector('.seter')
  const dagerEl = row.querySelector('.dager')

  function toggleSeter(){
    seterEl.style.display = venueEl.value==='Kundelokale' ? 'none' : ''
  }
  function maybeSetDefault(){
    if(!dagerEl.value || Number(dagerEl.value)===356 || Number(dagerEl.value)===310 || Number(dagerEl.value)===104){
      dagerEl.value = defaultDays(venueEl.value, musicEl.value)
    }
  }
  venueEl.addEventListener('change', ()=>{ toggleSeter(); maybeSetDefault() })
  musicEl.addEventListener('change', ()=>{ maybeSetDefault() })
  toggleSeter()
}

function addRow(preset){
  const wrap=$$('#tariff-rows')
  wrap.insertAdjacentHTML('beforeend', rowTemplate(preset))
  const row = wrap.lastElementChild
  attachRowLogic(row)
}
function updateTariffDefault(){ $$('#tariff-rows').innerHTML=''; addRow() }

function resetForm(){
  ;['orgnr','navn','besoksadresse','besoks_postnr','besoks_poststed','firma','hoyttalere','kommentar'].forEach(id=> $$('#'+id).value='')
  $$('#tariff-rows').innerHTML=''; brregLog.textContent=''; addRow(); toast('Skjema nullstilt')
}

function getFormData(){
  const rows=[]
  $$('#tariff-rows').querySelectorAll('.tariff-row').forEach(r=>{
    rows.push({
      venue: r.querySelector('.venue').value,
      music: r.querySelector('.music').value,
      kvm: r.querySelector('.kvm').value,
      seter: r.querySelector('.seter').value,
      dager: r.querySelector('.dager').value
    })
  })
  return {
    orgnr: $$('#orgnr').value,
    navn: $$('#navn').value,
    adresse: $$('#besoksadresse').value,
    postnr: $$('#besoks_postnr').value,
    poststed: $$('#besoks_poststed').value,
    firma: $$('#firma').value,
    tariff: rows,
    hoyttalere: $$('#hoyttalere').value,
    kommentar: $$('#kommentar').value,
    dato: new Date().toISOString()
  }
}

// ===== Supabase: lagring
async function saveControl(status){
  const user = await currentUser(); if(!user){ toast('Innlogging kreves'); return }
  const payload=getFormData()
  const { error } = await supabase.from('controls').insert({ user_id: user.id, orgnr: payload.orgnr||null, data: payload, status })
  if(error){ console.error(error); toast('Kunne ikke lagre'); return }
  toast(status==='sent'?'Sendt':'Lagret')
  if(status==='sent'){ renderArchive() }
}

async function fetchControls(){
  const { data, error } = await supabase.from('controls').select('*').order('created_at',{ ascending:false })
  if(error){ console.error(error); return [] }
  return data
}

async function saveList(name, items){
  const user = await currentUser(); if(!user){ toast('Innlogging kreves'); return }
  const { error } = await supabase.from('lists').insert({ user_id:user.id, name, items })
  if(error){ console.error(error); toast('Kunne ikke lagre liste'); return }
  toast('Liste importert'); await renderDashboard()
}
async function fetchLists(){
  const { data, error } = await supabase.from('lists').select('*').order('created_at',{ ascending:false })
  if(error){ console.error(error); return [] }
  return data
}

// ===== PDF & Print
function buildPdf(doc, data){
  let y=8
  doc.setFontSize(14); doc.text('TONO • GRAMO', 36, y, { align:'center' }); y+=7
  doc.setFontSize(11); doc.text('Kontrollskjema for bruk av musikk', 36, y, { align:'center' }); y+=8
  doc.setFontSize(10)

  const L = [
    `Besøksnavn: ${data.navn||''}`,
    `Besøksadresse: ${data.adresse||''}`,
    `Post: ${data.postnr||''} ${data.poststed||''}`,
    `Org.nr: ${data.orgnr||''}`
  ]
  L.forEach(t=>{ doc.text(t,4,y); y+=5 })

  y+=2; doc.text('Linjer:',4,y); y+=5
  data.tariff.forEach((t,i)=>{
    const sit = (t.venue==='Serveringssted' && t.seter) ? ` • ${t.seter} seter` : ''
    const mus = t.music==='Bakgrunn' ? 'Bakgrunnsmusikk' : 'Fremtredende musikk'
    doc.text(`${i+1}. ${t.venue} • ${mus} • ${t.kvm} kvm${sit} • ${t.dager} dager/år`, 6, y)
    y+=5
  })

  y+=3; doc.text(`Høyttalere: ${data.hoyttalere||''}`,4,y); y+=5
  const wrap = doc.splitTextToSize(`Kommentar: ${data.kommentar||''}`, 64)
  wrap.forEach(line=>{ doc.text(line,4,y); y+=4 })

  y+=6; doc.text('Signert: ______________________',4,y); y+=6
  const d=new Date(); doc.text(`Kontrollert: ${d.toLocaleDateString('nb-NO')} kl ${d.toLocaleTimeString('nb-NO',{hour:'2-digit',minute:'2-digit'})}`,4,y)
}

function generatePDF(data){
  const { jsPDF } = window.jspdf || {};
  if(!jsPDF){ alert('PDF-bibliotek mangler'); return; }
  const doc=new jsPDF({ unit:'mm', format:[72,200] });
  buildPdf(doc, data)
  const filename='kontroll-'+(data.orgnr||'')+'.pdf'
  try{ doc.save(filename) }
  catch(e){
    const blob=doc.output('blob'); const url=URL.createObjectURL(blob);
    const a=document.createElement('a'); a.href=url; a.download=filename; a.rel='noopener';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(url), 1500)
  }
}

function printReceipt(){
  const data=getFormData()
  const text=`KONTROLL\n${data.navn}\n${data.orgnr}\n${data.tariff.map(t=>`${t.venue}/${t.music}: ${t.kvm}kvm/${t.dager}d`).join('\n')}\n${data.kommentar}`
  const win=window.open('','','width=360,height=520'); win.document.write('<pre style="font:14px monospace">'+sanitize(text)+'</pre>'); win.print()
}

// ===== LISTER (UI)
async function importExcel(e){
  const file=e.target.files[0]; if(!file) return
  const reader=new FileReader()
  reader.onload = async ev => {
    const data = new Uint8Array(ev.target.result)
    const wb = XLSX.read(data, { type: 'array' })
    const name = (file.name||'Liste').replace(/\.(xlsx|xls)$/i,'')
    const L = { name, items: [] }
    wb.SheetNames.forEach(sheet=>{
      const ws=wb.Sheets[sheet]; const json=XLSX.utils.sheet_to_json(ws,{ header:1 })
      json.slice(1).forEach(row=>{
        L.items.push({
          Orgnummer: String(row[1]||'').trim(),
          Navn: String(row[2]||'').trim(),
          Gateadresse: String(row[3]||'').trim(),
          Postnr: String(row[4]||'').trim(),
          Poststed: String(row[5]||'').trim(),
          Kommentar: String(row[0]||'').trim()
        })
      })
    })
    await saveList(L.name, L.items)
  }
  reader.readAsArrayBuffer(file)
}

async function renderDashboard(){
  const lists = await fetchLists()
  const d=$$('#lists-dashboard'); d.innerHTML=''
  const q = ($$('#search').value||'').toLowerCase()
  lists.forEach(L=>{
    const box=document.createElement('div'); box.className='card'
    box.innerHTML=`
      <div class="list-header">
        <span style="cursor:default">${sanitize(L.name)}</span>
        <small>${new Date(L.created_at).toLocaleDateString('nb-NO')}</small>
      </div>
      <div class="list-scroll">
        <table class="list-table">
          <thead>
            <tr>
              <th style="width:110px">Orgnr</th>
              <th style="width:220px">Besøksnavn</th>
              <th style="width:260px">Gateadresse</th>
              <th style="width:120px">Post</th>
              <th>Kommentar</th>
              <th style="width:80px"></th>
            </tr>
          </thead>
          <tbody id="tbody-${L.id}"></tbody>
        </table>
      </div>`
    d.appendChild(box)
    const tbody=$$('#tbody-'+L.id)
    L.items.forEach((it,i)=>{
      const hay=[it.Orgnummer,it.Navn,it.Gateadresse,it.Postnr,it.Poststed,it.Kommentar].join(' ').toLowerCase()
      if(q && !hay.includes(q)) return
      const tr=document.createElement('tr'); tr.className='list-row'
      tr.innerHTML=`
        <td>${sanitize(it.Orgnummer||'')}</td>
        <td>
          <button class="btn-tiny" title="Åpne i skjema" onclick='(function(){
            document.getElementById("orgnr").value=${JSON.stringify(it.Orgnummer||'')};
            document.getElementById("navn").value=${JSON.stringify(it.Navn||'')};
            document.getElementById("besoksadresse").value=${JSON.stringify(it.Gateadresse||'')};
            document.getElementById("besoks_postnr").value=${JSON.stringify(it.Postnr||'')};
            document.getElementById("besoks_poststed").value=${JSON.stringify(it.Poststed||'')};
            show("kontroll");
            (async()=>{ const n="${sanitize(it.Orgnummer||'')}".replace(/\\D/g,''); if(n.length===9){
              try{ const r=await fetch("https://data.brreg.no/enhetsregisteret/api/enheter/"+n);
                if(r.ok){ const d=await r.json(); const a=d.forretningsadresse||d.beliggenhetsadresse||{};
                  document.getElementById("besoks_postnr").value=a.postnummer||'';
                  document.getElementById("besoks_poststed").value=a.poststed||'';
                  document.getElementById("firma").value=d.navn||'';
                }
              }catch(e){}
            }})();
          })()'>${sanitize(it.Navn||'Åpne')}</button>
        </td>
        <td>${sanitize(it.Gateadresse||'')}</td>
        <td>${sanitize((it.Postnr||'')+' '+(it.Poststed||''))}</td>
        <td contenteditable onblur="(async()=>{ try{
          const { data:list } = await supabase.from('lists').select('*').eq('id','${L.id}').single();
          list.items[${i}].Kommentar=this.innerText;
          await supabase.from('lists').update({ items:list.items }).eq('id','${L.id}');
        }catch(e){ console.error(e) } })()">${sanitize(it.Kommentar||'')}</td>
        <td class="action-btns">
          <button class="btn-tiny" title="Slett rad" onclick="(async()=>{ try{
            const { data:list } = await supabase.from('lists').select('*').eq('id','${L.id}').single();
            list.items.splice(${i},1);
            await supabase.from('lists').update({ items:list.items }).eq('id','${L.id}');
            await renderDashboard();
          }catch(e){ console.error(e) } })()">🗑</button>
        </td>`
      tbody.appendChild(tr)
    })
  })
}

async function renderArchive(){
  const rows = await fetchControls()
  const div=$$('#archive'); div.innerHTML=''
  const byMonth = {}
  rows.forEach(c=>{ const m=new Date(c.created_at).toLocaleDateString('nb-NO',{year:'numeric',month:'long'}); (byMonth[m]=byMonth[m]||[]).push(c) })
  Object.keys(byMonth).sort().reverse().forEach(month=>{
    const el=document.createElement('div'); el.className='month-header'; el.textContent=month; div.appendChild(el)
    byMonth[month].forEach(c=>{
      const data=c.data||{}
      const li=document.createElement('div'); li.className='archive-item'
      li.innerHTML=`<b>${sanitize(data.navn||'')}</b> – ${new Date(c.created_at).toLocaleDateString('nb-NO')}<br>
        ${(data.tariff||[]).map(t=>{
          const sit = (t.venue==='Serveringssted' && t.seter)?` • ${sanitize(t.seter)} seter`:''
          const mus = t.music==='Bakgrunn'?'Bakgrunnsmusikk':'Fremtredende musikk'
          return `${sanitize(t.venue)} • ${mus} • ${sanitize(t.kvm)} kvm${sit} • ${sanitize(t.dager)} dager`
        }).join('<br>')}`
      div.appendChild(li)
    })
  })
}

// ===== events
// auth ui
$$('#loginBtn').addEventListener('click', async ()=>{
  clearAuthError()
  try{ const { error } = await supabase.auth.signInWithPassword({ email: $$('#email').value, password: $$('#password').value }); if(error) throw error }
  catch(e){ showAuthError(e); toast('Innlogging feilet') }
})
$$('#signupBtn').addEventListener('click', async ()=>{
  clearAuthError()
  try{ const { error } = await supabase.auth.signUp({ email: $$('#email').value, password: $$('#password').value }); if(error) throw error; toast('Bruker opprettet') }
  catch(e){ showAuthError(e); toast('Oppretting feilet') }
})
$$('#magicBtn').addEventListener('click', async ()=>{
  clearAuthError()
  try{ const { error } = await supabase.auth.signInWithOtp({ email: $$('#email').value }); if(error) throw error; toast('Sjekk e-post (magisk lenke)') }
  catch(e){ showAuthError(e); toast('Kunne ikke sende lenke') }
})

// nav
$$$('nav button').forEach(b=> b.addEventListener('click', ()=>{ show(b.dataset.page) }))

// brreg & form
$$('#brregBtn').addEventListener('click', ()=>searchBrreg())
$$('#orgnr').addEventListener('input', ()=>{ const n=$$('#orgnr').value.replace(/\D/g,''); if(n.length===9) searchBrreg() })
$$('#addRowBtn').addEventListener('click', ()=>addRow())
$$('#resetBtn').addEventListener('click', resetForm)
$$('#saveDraftBtn').addEventListener('click', ()=>saveControl('draft'))
$$('#printBtn').addEventListener('click', printReceipt)

// Send PDF: last ned STRAKS (doc.save), lagre i bakgrunnen
$$('#sendBtn').addEventListener('click', ()=>{
  const payload = getFormData()
  generatePDF(payload)        // nedlasting/visning med en gang
  saveControl('sent').catch(console.error) // ikke blokker nedlasting
})

// lister
$$('#excelFile').addEventListener('change', importExcel)
$$('#logoutBtn').addEventListener('click', async ()=>{ await supabase.auth.signOut(); show('login'); toast('Logget ut') })
$$('#search').addEventListener('input', ()=>renderDashboard())

// auth routing
supabase.auth.onAuthStateChange((_e, session)=>{ if(session?.user){ show('kontroll'); updateTariffDefault(); renderDashboard(); renderArchive() } else { show('login'); updateTariffDefault() } })

// init
;(async function init(){
  const { data:{ session } } = await supabase.auth.getSession()
  if(session?.user){ show('kontroll'); updateTariffDefault(); renderDashboard(); renderArchive() } else { show('login'); updateTariffDefault() }
})()
