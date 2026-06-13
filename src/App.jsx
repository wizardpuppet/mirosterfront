import { useState, useEffect } from 'react'

const AEROPUERTOS = {
  AEP: 'Aeroparque Jorge Newbery', EZE: 'Ezeiza Ministro Pistarini',
  CRD: 'Comodoro Rivadavia', MDZ: 'El Plumerillo Mendoza',
  COR: 'Córdoba Ambrosio Taravella', TUC: 'Tucumán Benjamín Matienzo',
  ROS: 'Rosario Islas Malvinas', SFN: 'Santa Fe', BHI: 'Bahía Blanca',
  NQN: 'Neuquén', BRC: 'Bariloche Luis Candelaria',
  PMY: 'Puerto Madryn', USH: 'Ushuaia Malvinas Argentinas',
  RGL: 'Río Gallegos', FTE: 'El Calafate', IGR: 'Iguazú Cataratas',
  SLA: 'Salta Martín Miguel de Güemes', JUJ: 'Jujuy Horacio Guzmán',
  RSA: 'Santa Rosa', VDM: 'Viedma', PMQ: 'Perito Moreno',
  CTC: 'Catamarca', IRJ: 'La Rioja', UAQ: 'San Juan', AFA: 'San Rafael',
  RCU: 'Villa Mercedes', CPC: 'Chapelco', REL: 'Trelew', MDP: 'Mar del Plata',
  EPA: 'El Palomar', FMA: 'Formosa', RES: 'Resistencia', PSS: 'Posadas',
  CNQ: 'Corrientes', MVD: 'Montevideo Carrasco', ASU: 'Asunción Silvio Pettirossi',
  SCL: 'Santiago Arturo Merino Benítez', LIM: 'Lima Jorge Chávez',
  BOG: 'Bogotá El Dorado', GRU: 'São Paulo Guarulhos',
  GIG: 'Río de Janeiro Galeão', MIA: 'Miami International',
  JFK: 'New York John F. Kennedy', MAD: 'Madrid Barajas',
  BCN: 'Barcelona El Prat', FCO: 'Roma Fiumicino',
  CDG: 'París Charles de Gaulle', AMS: 'Ámsterdam Schiphol',
}

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const MESES_ABREV = {0:'JAN',1:'FEB',2:'MAR',3:'APR',4:'MAY',5:'JUN',6:'JUL',7:'AUG',8:'SEP',9:'OCT',10:'NOV',11:'DEC'}
const MESES_CORTO = {JAN:'Ene',FEB:'Feb',MAR:'Mar',APR:'Abr',MAY:'May',JUN:'Jun',JUL:'Jul',AUG:'Ago',SEP:'Sep',OCT:'Oct',NOV:'Nov',DEC:'Dic'}
const DIAS_SEMANA = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']
const DIAS_SEMANA_CORTO = {MON:'Lun',TUE:'Mar',WED:'Mié',THU:'Jue',FRI:'Vie',SAT:'Sáb',SUN:'Dom'}
const ROLE_LABEL = { CP:'Comandante', FO:'Copiloto', CM:'Jefe de Cabina', AX:'Auxiliar' }
const ROLE_COLOR = { CP:'#003087', FO:'#7F77DD', CM:'#1D9E75', AX:'#EF9F27' }
const COLOR_TIPO = { libre:'#1D9E75', dl:'#378ADD', vuelo:'#7F77DD', guardia:'#EF9F27' }
const LABEL_TIPO = { libre:'Dia OFF', dl:'D/L', vuelo:'Vuelo', guardia:'Guardia' }

// ─── CACHÉ ────────────────────────────────────────────────────────────────────
// Guarda el roster procesado y cuándo fue la última sincronización.
// Al iniciar la app, carga el roster guardado (funciona offline).

function guardarRosterCache(roster) {
  try {
    localStorage.setItem('ar_roster', JSON.stringify(roster))
    localStorage.setItem('ar_roster_ts', Date.now().toString())
  } catch (e) {
    console.warn('No se pudo guardar caché del roster:', e)
  }
}

function cargarRosterCache() {
  try {
    const raw = localStorage.getItem('ar_roster')
    if (!raw) return {}
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

function tiempoDesdeSync() {
  const ts = localStorage.getItem('ar_roster_ts')
  if (!ts) return null
  const diff = Date.now() - parseInt(ts)
  const hs = Math.floor(diff / 3600000)
  const mins = Math.floor((diff % 3600000) / 60000)
  if (hs > 0) return `Hace ${hs}h ${mins}m`
  if (mins > 0) return `Hace ${mins} min`
  return 'Ahora mismo'
}
// ─────────────────────────────────────────────────────────────────────────────

function colorTipo(t) { return COLOR_TIPO[t] || '#ccc' }
function labelTipo(t) { return LABEL_TIPO[t] || t || '' }

function ModalBase({ onClose, children, dark }) {
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', display:'flex', alignItems:'flex-end', zIndex:200 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: dark ? '#1e1e2e' : '#fff',
        borderRadius:'24px 24px 0 0', padding:'24px 24px 36px',
        width:'100%', boxSizing:'border-box', maxHeight:'85vh', overflowY:'auto'
      }}>
        {children}
      </div>
    </div>
  )
}

function BtnCerrar({ onClose, dark }) {
  return (
    <button onClick={onClose} style={{
      width:'100%', marginTop:12, padding:14,
      background: dark ? '#2a2a3e' : '#f0f0f0',
      border:'none', borderRadius:12, fontSize:15, fontWeight:600,
      color: dark ? '#aaa' : '#333', cursor:'pointer'
    }}>Cerrar</button>
  )
}

function procesarVuelos(vuelos) {
  const days = {}
  const mesesN = {JAN:0,FEB:1,MAR:2,APR:3,MAY:4,JUN:5,JUL:6,AUG:7,SEP:8,OCT:9,NOV:10,DEC:11}

  for (const v of vuelos) {
    // Para actividades sin salida (libre, DL), usar checkin si existe
    const fechaRef = v.salida || v.checkin
    if (!fechaRef) continue

    const m = fechaRef.match(/(MON|TUE|WED|THU|FRI|SAT|SUN)\s+(\d{2})(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)/)
    if (!m) continue

    const dayName = m[1]
    const dia = parseInt(m[2])
    const mesKey = m[3]
    const key = `${mesKey}${String(dia).padStart(2,'0')}`
    const tipo = v.tipo || 'vuelo'

    if (!days[key]) {
      days[key] = { tipo, dia, mes: mesesN[mesKey], dayName, flights: [], checkin: null, checkout: null }
    }

    if (tipo === 'vuelo' && days[key].tipo !== 'vuelo') days[key].tipo = 'vuelo'

    const dep = (v.salida?.match(/(\d{2}:\d{2})$/) || [])[1] || ''
    const arr = (v.llegada?.match(/(\d{2}:\d{2})$/) || [])[1] || ''
    const ci  = (v.checkin?.match(/(\d{2}:\d{2})$/) || [])[1]
    const co  = (v.checkout?.match(/(\d{2}:\d{2})$/) || [])[1]

    if (ci && !days[key].checkin) days[key].checkin = ci
    if (co) days[key].checkout = co

    if (tipo === 'vuelo') {
      days[key].flights.push({
        num: v.vuelo, from: v.origen, to: v.destino, dep, arr, crew: v.crew || []
      })
    }
  }

  return days
}

export default function App() {
  const [usuario, setUsuario] = useState(() => localStorage.getItem('ar_usuario') || '')
  const [clave, setClave]     = useState(() => localStorage.getItem('ar_clave') || '')
  const [dark, setDark]       = useState(() => localStorage.getItem('ar_dark') === 'true')
  const [loading, setLoading] = useState(false)
  // ← Inicia con el roster cacheado (funciona offline desde el primer render)
  const [roster, setRoster]   = useState(() => cargarRosterCache())
  const [ultimaSync, setUltimaSync] = useState(() => tiempoDesdeSync())
  const [vista, setVista]     = useState('calendario')
  const hoy = new Date()
  const [mesActual, setMesActual]   = useState(hoy.getMonth())
  const [anioActual, setAnioActual] = useState(hoy.getFullYear())
  const [diaSeleccionado, setDiaSeleccionado] = useState(null)
  const [flightModal, setFlightModal] = useState(null)
  const [flightTab, setFlightTab]     = useState('info')
  const [configModal, setConfigModal] = useState(false)
  const [usuarioEdit, setUsuarioEdit] = useState('')
  const [claveEdit, setClaveEdit]     = useState('')
  const [guardado, setGuardado]       = useState(false)

  // Actualizar el texto "hace X minutos" cada minuto
  useEffect(() => {
    const interval = setInterval(() => setUltimaSync(tiempoDesdeSync()), 60000)
    return () => clearInterval(interval)
  }, [])

  const d = dark
  const bg     = d ? '#12121e' : '#f5f7fb'
  const card   = d ? '#1e1e2e' : '#fff'
  const text   = d ? '#e0e0f0' : '#1a1a2e'
  const sub    = d ? '#888'    : '#555'
  const border = d ? '#2a2a3e' : '#eee'

  const abrirConfig = () => {
    setUsuarioEdit(usuario)
    setClaveEdit(clave)
    setGuardado(false)
    setConfigModal(true)
  }

  const guardarConfig = () => {
    setUsuario(usuarioEdit)
    setClave(claveEdit)
    localStorage.setItem('ar_usuario', usuarioEdit)
    localStorage.setItem('ar_clave', claveEdit)
    setGuardado(true)
    setTimeout(() => setConfigModal(false), 800)
  }

  const toggleDark = () => {
    const next = !dark
    setDark(next)
    localStorage.setItem('ar_dark', String(next))
  }

  const primerDia  = new Date(anioActual, mesActual, 1).getDay()
  const diasEnMes  = new Date(anioActual, mesActual + 1, 0).getDate()
  const getDayData = (dia) => roster[`${MESES_ABREV[mesActual]}${String(dia).padStart(2,'0')}`] || null
  const diaData    = diaSeleccionado ? getDayData(diaSeleccionado) : null
  const diasAgenda = Object.entries(roster)
    .filter(([, d]) => d.mes === mesActual)
    .sort((a, b) => a[1].dia - b[1].dia)


    const sincronizar = async () => {
  if (!usuario || !clave) {
    abrirConfig()
    return
  }

  try {
    setLoading(true)

    const response = await fetch(
      'https://miroster-production.up.railway.app/roster',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario, clave })
      }
    )

    const data = await response.json()

    if (!data.ok) {
      alert('Error obteniendo roster. Mostrando programación guardada.')
      return
    }

    const rosterProcesado = procesarVuelos(data.vuelos || [])

    if (Object.keys(rosterProcesado).length > 0) {
      // Merge: el nuevo roster sobreescribe solo los días que trae; los días pasados que ya no vienen se conservan
      setRoster(prev => {
        const merged = { ...prev, ...rosterProcesado }
        guardarRosterCache(merged)
        return merged
      })
      setUltimaSync('Ahora mismo')
    } else {
      alert(
        'La sincronización devolvió una programación vacía. Se conserva la programación guardada.'
      )
    }
  } catch (err) {
    console.error(err)
    alert(
      'Error conectando al servidor. Mostrando programación guardada.'
    )
  } finally {
    setLoading(false)
  }
}

  const abrirVuelo = (flight, dayData) => {
    setFlightModal({ flight, dayData })
    setFlightTab('info')
    setDiaSeleccionado(null)
  }

  const inputStyle = {
    width:'100%', boxSizing:'border-box', padding:14, borderRadius:10,
    border:`1px solid ${border}`, fontSize:16, marginBottom:12, marginTop:4,
    background: d ? '#2a2a3e' : '#fff', color: text, outline:'none'
  }

  const tieneRoster = Object.keys(roster).length > 0

  return (
    <div style={{
  minHeight:'100vh',
  background:bg,
  fontFamily:"'Segoe UI', Arial, sans-serif",
  color:text,
  overflowX:'hidden'
}}>

      {/* HEADER */}
      <div style={{ background:card, borderBottom:`1px solid ${border}`, padding:'14px 20px', display:'flex', justifyContent:'space-between', alignItems:'center', position:'sticky', top:0, zIndex:100 }}>
        <div>
          <span style={{ fontSize:18, fontWeight:700, color:text }}>✈️ Mi Programación</span>
          {ultimaSync && tieneRoster && (
            <div style={{ fontSize:11, color:sub, marginTop:1 }}>🔄 {ultimaSync}</div>
          )}
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={toggleDark} style={{ background:d?'#2a2a3e':'#f0f0f0', color:sub, border:'none', borderRadius:8, padding:'8px 12px', fontSize:16, cursor:'pointer' }}>
            {d?'☀️':'🌙'}
          </button>
          <button onClick={abrirConfig} style={{ background:d?'#2a2a3e':'#f0f0f0', color:sub, border:'none', borderRadius:8, padding:'8px 12px', fontSize:16, cursor:'pointer' }}>⚙️</button>
          <button onClick={sincronizar} disabled={loading} style={{ background:'#003087', color:'#fff', border:'none', borderRadius:8, padding:'8px 16px', fontWeight:700, fontSize:13, cursor:'pointer', opacity:loading?0.7:1 }}>
            {loading?'Cargando...':'⟳ SYNC'}
          </button>
        </div>
      </div>

      {/* BANNER offline si hay roster cacheado pero no hay conexión */}
      {tieneRoster && !navigator.onLine && (
        <div style={{ background:'#EF9F27', color:'#fff', fontSize:12, textAlign:'center', padding:'6px 16px' }}>
          📴 Sin conexión — mostrando programación guardada
        </div>
      )}

      {/* TABS */}
      <div style={{ padding:'12px 16px 0', background:card, borderBottom:`1px solid ${border}` }}>
        <div style={{ display:'flex', background:d?'#2a2a3e':'#f0f0f0', borderRadius:10, padding:3, maxWidth:300 }}>
          {['calendario','agenda'].map(v => (
            <button key={v} onClick={() => setVista(v)} style={{
              flex:1, padding:'7px 0', border:'none', borderRadius:8, cursor:'pointer', fontSize:13,
              fontWeight:vista===v?700:500,
              background:vista===v?(d?'#12121e':'#fff'):'transparent',
              color:vista===v?text:sub,
              boxShadow:vista===v?'0 1px 4px rgba(0,0,0,0.2)':'none'
            }}>{v.charAt(0).toUpperCase()+v.slice(1)}</button>
          ))}
        </div>
      </div>

      {/* NAV MES */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 24px', background:card }}>
        <button onClick={() => mesActual===0?(setMesActual(11),setAnioActual(a=>a-1)):setMesActual(m=>m-1)}
          style={{ background:'none', border:'none', fontSize:28, color:'#003087', cursor:'pointer' }}>‹</button>
        <span style={{ fontWeight:700, fontSize:16, color:text }}>{MESES[mesActual]} {anioActual}</span>
        <button onClick={() => mesActual===11?(setMesActual(0),setAnioActual(a=>a+1)):setMesActual(m=>m+1)}
          style={{ background:'none', border:'none', fontSize:28, color:'#003087', cursor:'pointer' }}>›</button>
      </div>

      {/* CALENDARIO */}
      {vista === 'calendario' && (
        <div style={{ padding:'0 8px' }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(7,minmax(0,1fr))', marginBottom:4 }}>
            {DIAS_SEMANA.map(ds => <div key={ds} style={{ textAlign:'center', fontSize:11, color:sub, padding:'4px 0' }}>{ds}</div>)}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(7,minmax(0,1fr))', gap:2 }}>
            {Array(primerDia).fill(null).map((_,i) => <div key={`e-${i}`} />)}
            {Array(diasEnMes).fill(null).map((_,i) => {
              const dia = i+1
              const data = getDayData(dia)
              const esHoy = dia===hoy.getDate() && mesActual===hoy.getMonth() && anioActual===hoy.getFullYear()
              return (
                <div key={dia} onClick={() => data && setDiaSeleccionado(dia)} style={{
                  aspectRatio:'1', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
                  borderRadius:8, border:data?`2px solid ${colorTipo(data.tipo)}`:`1px solid ${border}`,
background:
  data?.tipo === 'vuelo'
    ? '#7F77DD'
    : data?.tipo === 'guardia'
    ? '#EF9F27'
    : data?.tipo === 'dl'
    ? '#378ADD'
    : data?.tipo === 'libre'
    ? '#1D9E75'
    : esHoy
    ? (d ? '#1a1a3e' : '#f0f4ff')
    : card, cursor:data?'pointer':'default'
                }}>
                  <span style={{ fontSize:14, fontWeight:esHoy?700:400, color:data ? '#fff' : (esHoy ? '#4e7fff' : text), lineHeight:1 }}>{dia}</span>
                  {data && (
                    <span style={{ fontSize:8, fontWeight:700, color:'#fff', marginTop:1, lineHeight:1 }}>
                      {data.tipo === 'vuelo' ? (data.flights.length > 1 ? `${data.flights.length}✈` : '✈') :
                       data.tipo === 'guardia' ? 'GUA' :
                       data.tipo === 'dl' ? 'D/L' : 'OFF'}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
          <div style={{ display:'flex', justifyContent:'center', gap:16, padding:'12px 0', flexWrap:'wrap' }}>
            {[['#7F77DD','Vuelo'],['#1D9E75','Dia OFF'],['#378ADD','D/L'],['#EF9F27','Guardia']].map(([color,label]) => (
              <div key={label} style={{ display:'flex', alignItems:'center', gap:5 }}>
                <div style={{ width:10, height:10, borderRadius:5, background:color }} />
                <span style={{ fontSize:12, color:sub }}>{label}</span>
              </div>
            ))}
          </div>
          {!tieneRoster && (
            <div style={{ textAlign:'center', padding:40, color:sub }}>
              <div style={{ fontSize:15, marginBottom:6 }}>Sin programación cargada</div>
              <div style={{ fontSize:13 }}>Tocá ⟳ SYNC para sincronizar</div>
            </div>
          )}
        </div>
      )}

      {/* AGENDA */}
      {vista === 'agenda' && (
        <div>
          {diasAgenda.length === 0 && (
            <div style={{ textAlign:'center', padding:40, color:sub }}>
              <div style={{ fontSize:15, marginBottom:6 }}>Sin programación cargada</div>
              <div style={{ fontSize:13 }}>Tocá ⟳ SYNC para sincronizar</div>
            </div>
          )}
          {diasAgenda.map(([key, dayData]) => {
            const esHoyAgenda = dayData.dia === hoy.getDate() && dayData.mes === hoy.getMonth() && anioActual === hoy.getFullYear()
            return (
            <div key={key}>
              <div style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 16px', borderLeft:`4px solid ${esHoyAgenda ? '#1D9E75' : colorTipo(dayData.tipo)}`, background: esHoyAgenda ? (d?'#0e2e1e':'#e8f7ef') : (d?'#1a1a2e':'#f8f8ff'), marginTop:8 }}>
                <span style={{ fontSize:12, color: esHoyAgenda ? '#1D9E75' : sub, width:28, fontWeight: esHoyAgenda ? 700 : 400 }}>{DIAS_SEMANA_CORTO[dayData.dayName]||dayData.dayName}</span>
                <span style={{ fontSize:22, fontWeight:700, color: esHoyAgenda ? '#1D9E75' : text, width:32 }}>{dayData.dia}</span>
                <span style={{ fontSize:12, color: esHoyAgenda ? '#1D9E75' : sub, width:28 }}>{MESES_CORTO[MESES_ABREV[dayData.mes]]||''}</span>
                <span style={{ background:colorTipo(dayData.tipo), color:'#fff', borderRadius:12, padding:'2px 8px', fontSize:11, fontWeight:700 }}>{labelTipo(dayData.tipo)}</span>
                {esHoyAgenda && <span style={{ background:'#1D9E75', color:'#fff', borderRadius:12, padding:'2px 8px', fontSize:10, fontWeight:700, marginLeft:4 }}>HOY</span>}
                {dayData.checkin && <span style={{ marginLeft:'auto', fontSize:11, color:sub }}>CI {dayData.checkin}</span>}
              </div>
              {dayData.flights.map((f,i) => (
                <div key={i} onClick={() => abrirVuelo(f, dayData)} style={{ display:'flex', alignItems:'center', padding:'12px 16px', borderBottom:`1px solid ${border}`, cursor:'pointer', background:card }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:12, fontWeight:700, color:'#7F77DD' }}>{f.num}</div>
                    <div style={{ fontSize:15, fontWeight:500, color:text }}>{f.from} — {f.to}</div>
                  </div>
                  <div style={{ marginRight:8 }}><div style={{ fontSize:13, color:sub }}>{f.dep} - {f.arr}</div></div>
                  <span style={{ fontSize:22, color:sub }}>›</span>
                </div>
              ))}
            </div>
            )
          })}
        </div>
      )}

      {/* MODAL CONFIGURACIÓN */}
      {configModal && (
        <ModalBase onClose={() => setConfigModal(false)} dark={d}>
          <div style={{ fontSize:18, fontWeight:700, color:text, marginBottom:4 }}>⚙️ Configuración</div>
          <div style={{ fontSize:13, color:sub, marginBottom:20 }}>Guardá tus credenciales de Aerolíneas</div>
          <label style={{ fontSize:12, color:sub, fontWeight:600 }}>LEGAJO</label>
          <input placeholder="Legajo" value={usuarioEdit} onChange={e => setUsuarioEdit(e.target.value)} style={inputStyle} />
          <label style={{ fontSize:12, color:sub, fontWeight:600 }}>CONTRASEÑA</label>
          <input type="password" placeholder="Contraseña" value={claveEdit} onChange={e => setClaveEdit(e.target.value)} style={{ ...inputStyle, marginBottom:20 }} />
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
            <span style={{ fontSize:14, color:sub }}>Modo oscuro</span>
            <div onClick={toggleDark} style={{ width:44, height:24, borderRadius:12, background:d?'#003087':'#ccc', position:'relative', cursor:'pointer', transition:'background 0.2s' }}>
              <div style={{ width:18, height:18, borderRadius:9, background:'#fff', position:'absolute', top:3, left:d?23:3, transition:'left 0.2s' }} />
            </div>
          </div>
          <button onClick={guardarConfig} disabled={!usuarioEdit||!claveEdit} style={{
            width:'100%', padding:16, color:'#fff', border:'none', borderRadius:10, fontSize:16, fontWeight:700, cursor:'pointer', marginBottom:4,
            background:guardado?'#1D9E75':(!usuarioEdit||!claveEdit)?'#aaa':'#003087'
          }}>{guardado?'✓ Guardado':'Guardar'}</button>
          <button onClick={() => setConfigModal(false)} style={{ width:'100%', padding:14, background:'none', border:'none', color:sub, fontSize:14, cursor:'pointer' }}>Cancelar</button>
        </ModalBase>
      )}

      {/* MODAL DÍA */}
      {diaSeleccionado && (
        <ModalBase onClose={() => setDiaSeleccionado(null)} dark={d}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <span style={{ fontSize:18, fontWeight:700, color:text }}>{diaSeleccionado} de {MESES[mesActual]}</span>
            {diaData && <span style={{ border:`1.5px solid ${colorTipo(diaData.tipo)}`, borderRadius:20, padding:'3px 10px', fontSize:12, fontWeight:700, color:colorTipo(diaData.tipo) }}>{labelTipo(diaData.tipo)}</span>}
          </div>
          {diaData?.checkin && (
            <div style={{ display:'flex', gap:20, marginBottom:14, paddingBottom:14, borderBottom:`1px solid ${border}` }}>
              <span style={{ fontSize:13, color:sub }}>Check-in <strong style={{ color:text }}>{diaData.checkin}</strong></span>
              {diaData.checkout && <span style={{ fontSize:13, color:sub }}>Check-out <strong style={{ color:text }}>{diaData.checkout}</strong></span>}
            </div>
          )}
          {!diaData && <div style={{ textAlign:'center', color:sub, padding:20, fontSize:14 }}>Sin programación</div>}
          {diaData?.flights?.map((f,i) => (
            <div key={i} onClick={() => abrirVuelo(f, diaData)} style={{ display:'flex', alignItems:'center', background:d?'#2a2a3e':'#f8f8ff', borderRadius:12, padding:14, marginBottom:8, border:`1px solid ${border}`, cursor:'pointer' }}>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:12, fontWeight:700, color:'#7F77DD', marginBottom:2 }}>{f.num}</div>
                <div style={{ fontSize:16, fontWeight:600, color:text }}>{f.from} → {f.to}</div>
              </div>
              <div style={{ marginRight:8, textAlign:'right' }}>
                <div style={{ fontSize:13, color:sub }}>🛫 {f.dep}</div>
                {f.arr && <div style={{ fontSize:13, color:sub }}>🛬 {f.arr}</div>}
              </div>
              <span style={{ fontSize:22, color:sub }}>›</span>
            </div>
          ))}
          {diaData?.tipo !== 'vuelo' && (
            <div style={{ textAlign:'center', padding:20, color:sub, fontSize:14 }}>
              {diaData?.tipo === 'guardia' ? '🟡 Día de guardia' : diaData?.tipo === 'dl' ? '🔵 Día libre D/L' : '🟢 Día libre'}
            </div>
          )}
          <BtnCerrar onClose={() => setDiaSeleccionado(null)} dark={d} />
        </ModalBase>
      )}

      {/* MODAL VUELO */}
      {flightModal && (
        <ModalBase onClose={() => setFlightModal(null)} dark={d}>
          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:13, fontWeight:700, color:'#7F77DD' }}>{flightModal.flight.num}</div>
            <div style={{ fontSize:20, fontWeight:700, color:text }}>{flightModal.flight.from} → {flightModal.flight.to}</div>
          </div>
          <div style={{ display:'flex', background:d?'#2a2a3e':'#f0f0f0', borderRadius:10, padding:3, marginBottom:16 }}>
            {['info','crew'].map(t => (
              <button key={t} onClick={() => setFlightTab(t)} style={{
                flex:1, padding:'8px 0', border:'none', borderRadius:8, cursor:'pointer', fontSize:13,
                fontWeight:flightTab===t?700:500,
                background:flightTab===t?(d?'#12121e':'#fff'):'transparent',
                color:flightTab===t?'#003087':sub,
                boxShadow:flightTab===t?'0 1px 4px rgba(0,0,0,0.2)':'none'
              }}>{t==='info'?'Flight Info':'Crew Info'}</button>
            ))}
          </div>

          {flightTab === 'info' && (
            <div>
              <div style={{ display:'flex', gap:20, marginBottom:16, flexWrap:'wrap' }}>
                {[
                  ['Salida', flightModal.flight.dep, text],
                  ['Llegada', flightModal.flight.arr, text],
                  ...(flightModal.dayData?.checkin?[['Check-in', flightModal.dayData.checkin, '#1D9E75']]:[]),
                  ...(flightModal.dayData?.checkout?[['Check-out', flightModal.dayData.checkout, '#EF9F27']]:[]),
                ].map(([label, val, color]) => (
                  <div key={label} style={{ textAlign:'center' }}>
                    <div style={{ fontSize:11, color:sub, marginBottom:4 }}>{label}</div>
                    <div style={{ fontSize:22, fontWeight:600, color }}>{val}</div>
                  </div>
                ))}
              </div>
              {[flightModal.flight.from, flightModal.flight.to].map(code => (
                <div key={code} style={{ background:d?'#2a2a3e':'#f8f8ff', borderRadius:10, padding:12, marginBottom:8 }}>
                  <div style={{ fontSize:18, fontWeight:700, color:'#003087' }}>{code}</div>
                  <div style={{ fontSize:13, color:sub, marginTop:2 }}>{AEROPUERTOS[code] || 'Aeropuerto'}</div>
                </div>
              ))}
            </div>
          )}

          {flightTab === 'crew' && (
            <div>
              {flightModal.flight.crew?.length > 0 ? flightModal.flight.crew.map((c,i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 0', borderBottom:`1px solid ${border}` }}>
                  <div style={{ width:36, height:36, borderRadius:18, background:ROLE_COLOR[c.role]||'#888', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <span style={{ color:'#fff', fontWeight:700, fontSize:12 }}>{c.role}</span>
                  </div>
                  <div>
                    <div style={{ fontSize:11, color:sub }}>{ROLE_LABEL[c.role]||c.role}</div>
                    <div style={{ fontSize:14, fontWeight:500, color:text }}>{c.name}</div>
                  </div>
                </div>
              )) : (
                <div style={{ textAlign:'center', color:sub, padding:20, fontSize:14 }}>Sin datos de tripulación</div>
              )}
            </div>
          )}

          <BtnCerrar onClose={() => setFlightModal(null)} dark={d} />
        </ModalBase>
      )}

    </div>
  )
}
