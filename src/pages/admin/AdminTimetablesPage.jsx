import { useEffect, useState } from 'react'
import AdminShell from './AdminShell'
import adminTimetablesService from '../../services/adminTimetablesService'
import "../admin-studios.css";

function AdminTimetablesPage() {
  const [timetables, setTimetables] = useState([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState(null)
  const [files, setFiles] = useState([])

  useEffect(() => { void load() }, [])

  async function load() {
    setLoading(true)
    try {
      const data = await adminTimetablesService.listTimetables()
      setTimetables(data)
    } catch (err) {
      console.error(err)
    } finally { setLoading(false) }
  }

  async function handleImport() {
    if (!files.length) return
    try {
      const preview = await adminTimetablesService.importOcr(files)
      // open modal or show preview - for now log and allow confirm
      // We'll just send confirm of parsed slots if any
      if (preview?.previews?.length) {
        const slots = [].concat(...preview.previews.map(p => p.parsed || []))
        await adminTimetablesService.confirmImport({ label: 'Imported', slots })
        await load()
        alert('Importado com sucesso')
      } else {
        alert('Nenhum slot detectado no OCR')
      }
    } catch (err) { console.error(err); alert('Erro ao importar') }
  }

  return (
    <AdminShell title="Mapas de Horário" subtitle="Gestão de mapas e slots" activePath="/admin/timetables">
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        <div style={{ width: 320 }}>
          <h3>Mapas</h3>
          <div>
            {loading ? <p>Carregando...</p> : timetables.map((t) => (
              <button key={t.TimetableID} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 10px', marginBottom: 6 }} onClick={() => setSelected(t)}>
                {t.Label} {t.IsActive ? '(activo)' : ''}
              </button>
            ))}
          </div>

          <hr />
          <h4>Importar por OCR</h4>
          <input type="file" multiple accept="image/*" onChange={(e) => setFiles(Array.from(e.target.files))} />
          <div style={{ marginTop: 8 }}>
            <button onClick={handleImport} className="cta">Importar</button>
          </div>
        </div>

        <div style={{ flex: 1 }}>
          <h3>Editor</h3>
          {selected ? (
            <div>
              <h4>{selected.Label}</h4>
              <p>{selected.Slots?.length || 0} slots</p>
              <ul>
                {selected.Slots?.map((s) => (
                  <li key={s.SlotID}>{s.DayOfWeek} · {String(Math.floor(s.StartMinutes/60)).padStart(2,'0')}:{String(s.StartMinutes%60).padStart(2,'0')} - {s.Title}</li>
                ))}
              </ul>
            </div>
          ) : <p>Seleciona um mapa para editar.</p>}
        </div>
      </div>
    </AdminShell>
  )
}

export default AdminTimetablesPage
