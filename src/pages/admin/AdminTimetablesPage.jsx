import { useEffect, useMemo, useState } from 'react'
import AdminShell from './AdminShell'
import adminTimetablesService from '../../services/adminTimetablesService'
import studioManagementService from '../../services/studioManagementService'
import adminUsersService from '../../services/adminUsersService'
import { dayLabel, formatMinutes, sortTimetableSlots } from '../../services/timetableService'
import { localizeApiError } from '../../utils/apiErrors'
import '../admin-studios.css'
import './adminTimetables.css'

const DAYS = [1, 2, 3, 4, 5, 6, 7]
const DEFAULT_COLOR = '#0b9d8f'

function minutesToTimeInput(minutes) {
  const total = Number(minutes)
  if (!Number.isFinite(total)) return ''
  const hh = String(Math.floor(total / 60)).padStart(2, '0')
  const mm = String(total % 60).padStart(2, '0')
  return `${hh}:${mm}`
}

function timeInputToMinutes(value) {
  const match = String(value || '').match(/^(\d{1,2}):(\d{2})$/)
  if (!match) return null
  return Number(match[1]) * 60 + Number(match[2])
}

function teacherName(teacher) {
  return [teacher?.firstName, teacher?.lastName].filter(Boolean).join(' ') || teacher?.email || `#${teacher?.userId}`
}

function emptySlot(dayOfWeek, title) {
  return {
    SlotID: null,
    DayOfWeek: dayOfWeek,
    StartMinutes: 600,
    EndMinutes: 660,
    Title: title || '',
    TeacherUserID: '',
    StudioID: '',
    ModalityID: '',
    Color: DEFAULT_COLOR,
    Notes: '',
  }
}

function AdminTimetablesPage() {
  const [timetables, setTimetables] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [busy, setBusy] = useState(false)

  const [teachers, setTeachers] = useState([])
  const [studios, setStudios] = useState([])
  const [modalities, setModalities] = useState([])

  const [slotDraft, setSlotDraft] = useState(null)
  const [slotError, setSlotError] = useState('')

  const [mapDraft, setMapDraft] = useState(null)
  const [mapError, setMapError] = useState('')

  const selected = useMemo(
    () => timetables.find((t) => Number(t.TimetableID) === Number(selectedId)) || null,
    [timetables, selectedId],
  )

  const slotsByDay = useMemo(() => {
    const grouped = Object.fromEntries(DAYS.map((d) => [d, []]))
    sortTimetableSlots(selected?.Slots || []).forEach((slot) => {
      const day = Number(slot.DayOfWeek)
      if (grouped[day]) grouped[day].push(slot)
    })
    return grouped
  }, [selected])

  useEffect(() => {
    void loadTimetables()
    void loadOptions()
  }, [])

  async function loadTimetables(focusId) {
    setLoading(true)
    setError('')
    try {
      const data = await adminTimetablesService.listTimetables()
      const sorted = [...data].sort(
        (a, b) => Number(Boolean(b.IsActive)) - Number(Boolean(a.IsActive)) || String(a.Label).localeCompare(String(b.Label), 'pt'),
      )
      setTimetables(sorted)
      setSelectedId((current) => focusId || current || sorted[0]?.TimetableID || null)
    } catch (err) {
      setError(localizeApiError(err, 'Não foi possível carregar os mapas de horário.'))
    } finally {
      setLoading(false)
    }
  }

  async function loadOptions() {
    try {
      const [studioList, modalityList, usersResult] = await Promise.all([
        studioManagementService.listStudios().catch(() => []),
        studioManagementService.listModalitiesWithIds().catch(() => []),
        adminUsersService.listUsers({ role: 'teacher', limit: 100 }).catch(() => ({ users: [] })),
      ])
      setStudios(studioList)
      setModalities(modalityList)
      setTeachers(usersResult.users || [])
    } catch {
      /* opções são auxiliares — falha silenciosa */
    }
  }

  // ── Mapas ──
  function openCreateMap() {
    setMapError('')
    setMapDraft({ TimetableID: null, Label: '', IsActive: false })
  }

  function openEditMap(map) {
    setMapError('')
    setMapDraft({ TimetableID: map.TimetableID, Label: map.Label, IsActive: Boolean(map.IsActive) })
  }

  async function saveMap() {
    const label = String(mapDraft.Label || '').trim()
    if (!label) {
      setMapError('Indica o nome do mapa.')
      return
    }
    setBusy(true)
    setMapError('')
    try {
      const payload = { label, isActive: Boolean(mapDraft.IsActive) }
      if (mapDraft.TimetableID) {
        await adminTimetablesService.updateTimetable(mapDraft.TimetableID, payload)
        await loadTimetables(mapDraft.TimetableID)
      } else {
        const created = await adminTimetablesService.createTimetable(payload)
        await loadTimetables(created?.TimetableID)
      }
      setMapDraft(null)
    } catch (err) {
      setMapError(localizeApiError(err, 'Não foi possível guardar o mapa.'))
    } finally {
      setBusy(false)
    }
  }

  async function deleteMap(map) {
    if (!window.confirm(`Apagar o mapa "${map.Label}" e todos os seus blocos?`)) return
    setBusy(true)
    try {
      await adminTimetablesService.deleteTimetable(map.TimetableID)
      const remaining = timetables.filter((t) => t.TimetableID !== map.TimetableID)
      await loadTimetables(remaining[0]?.TimetableID || null)
    } catch (err) {
      setError(localizeApiError(err, 'Não foi possível apagar o mapa.'))
    } finally {
      setBusy(false)
    }
  }

  // ── Blocos / slots ──
  function openCreateSlot(dayOfWeek) {
    setSlotError('')
    setSlotDraft(emptySlot(dayOfWeek, selected?.Label))
  }

  function openEditSlot(slot) {
    setSlotError('')
    setSlotDraft({
      SlotID: slot.SlotID,
      DayOfWeek: Number(slot.DayOfWeek),
      StartMinutes: Number(slot.StartMinutes),
      EndMinutes: Number(slot.EndMinutes),
      Title: slot.Title || '',
      TeacherUserID: slot.TeacherUserID ?? '',
      StudioID: slot.StudioID ?? '',
      ModalityID: slot.ModalityID ?? '',
      Color: slot.Color || DEFAULT_COLOR,
      Notes: slot.Notes || '',
    })
  }

  async function saveSlot() {
    const title = String(slotDraft.Title || '').trim()
    const start = Number(slotDraft.StartMinutes)
    const end = Number(slotDraft.EndMinutes)
    if (!title) {
      setSlotError('Indica o título do bloco.')
      return
    }
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
      setSlotError('A hora de fim tem de ser posterior à de início.')
      return
    }
    setBusy(true)
    setSlotError('')
    try {
      const payload = {
        dayOfWeek: Number(slotDraft.DayOfWeek),
        startMinutes: start,
        endMinutes: end,
        title,
        teacherUserId: slotDraft.TeacherUserID ? Number(slotDraft.TeacherUserID) : null,
        studioId: slotDraft.StudioID ? Number(slotDraft.StudioID) : null,
        modalityId: slotDraft.ModalityID ? Number(slotDraft.ModalityID) : null,
        color: slotDraft.Color || null,
        notes: String(slotDraft.Notes || '').trim() || null,
      }
      if (slotDraft.SlotID) {
        await adminTimetablesService.updateSlot(slotDraft.SlotID, payload)
      } else {
        await adminTimetablesService.createSlot(selected.TimetableID, payload)
      }
      await loadTimetables(selected.TimetableID)
      setSlotDraft(null)
    } catch (err) {
      setSlotError(localizeApiError(err, 'Não foi possível guardar o bloco.'))
    } finally {
      setBusy(false)
    }
  }

  async function deleteSlot(slot) {
    if (!window.confirm('Apagar este bloco?')) return
    setBusy(true)
    try {
      await adminTimetablesService.deleteSlot(slot.SlotID)
      await loadTimetables(selected.TimetableID)
    } catch (err) {
      setError(localizeApiError(err, 'Não foi possível apagar o bloco.'))
    } finally {
      setBusy(false)
    }
  }

  const studioName = (id) => studios.find((s) => Number(s.id) === Number(id))?.name || ''
  const modalityName = (id) => modalities.find((m) => Number(m.id) === Number(id))?.name || ''
  const teacherLabel = (id) => {
    const t = teachers.find((teacher) => Number(teacher.userId) === Number(id))
    return t ? teacherName(t) : ''
  }

  const totalSlots = sortTimetableSlots(selected?.Slots || []).length

  return (
    <AdminShell title="Mapas de Horário" activePath="/admin/timetables">
      {error ? <div className="soft-box error timetable-admin-alert">{error}</div> : null}

      <div className="timetable-admin-layout">
        <aside className="timetable-admin-maps">
          <div className="timetable-admin-maps-head">
            <h3>Modalidades</h3>
            <button type="button" className="ghost-btn" onClick={openCreateMap} disabled={busy}>
              + Novo mapa
            </button>
          </div>

          {loading ? (
            <p className="timetable-admin-muted">A carregar…</p>
          ) : timetables.length === 0 ? (
            <p className="timetable-admin-muted">Ainda não existem mapas. Cria o primeiro.</p>
          ) : (
            <ul className="timetable-admin-map-list">
              {timetables.map((map) => {
                const count = sortTimetableSlots(map.Slots || []).length
                const isActive = Number(map.TimetableID) === Number(selectedId)
                return (
                  <li key={map.TimetableID}>
                    <button
                      type="button"
                      className={`timetable-admin-map-item${isActive ? ' selected' : ''}`}
                      onClick={() => setSelectedId(map.TimetableID)}
                    >
                      <span className="timetable-admin-map-name">
                        {map.Label}
                        {map.IsActive ? <span className="timetable-admin-badge">Ativo</span> : null}
                      </span>
                      <span className="timetable-admin-map-count">{count} bloco{count === 1 ? '' : 's'}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </aside>

        <section className="timetable-admin-editor">
          {!selected ? (
            <div className="timetable-admin-empty">
              <p>Seleciona um mapa à esquerda ou cria um novo para começar a editar.</p>
            </div>
          ) : (
            <>
              <header className="timetable-admin-editor-head">
                <div>
                  <h3>
                    {selected.Label}
                    {selected.IsActive ? <span className="timetable-admin-badge">Ativo</span> : null}
                  </h3>
                  <p className="timetable-admin-muted">
                    {totalSlots} bloco{totalSlots === 1 ? '' : 's'} distribuído{totalSlots === 1 ? '' : 's'} pela semana
                  </p>
                </div>
                <div className="timetable-admin-editor-actions">
                  <button type="button" className="ghost-btn" onClick={() => openEditMap(selected)} disabled={busy}>
                    Editar mapa
                  </button>
                  <button type="button" className="danger-btn" onClick={() => deleteMap(selected)} disabled={busy}>
                    Apagar mapa
                  </button>
                </div>
              </header>

              <div className="timetable-admin-board">
                {DAYS.map((day) => (
                  <div key={day} className="timetable-admin-day">
                    <div className="timetable-admin-day-head">{dayLabel(day)}</div>
                    <div className="timetable-admin-day-body">
                      {slotsByDay[day].length === 0 ? (
                        <p className="timetable-admin-day-empty">Sem blocos</p>
                      ) : (
                        slotsByDay[day].map((slot) => (
                          <article
                            key={slot.SlotID}
                            className="timetable-admin-slot"
                            style={{ '--slot-accent': slot.Color || DEFAULT_COLOR }}
                          >
                            <button
                              type="button"
                              className="timetable-admin-slot-main"
                              onClick={() => openEditSlot(slot)}
                            >
                              <strong>{formatMinutes(slot.StartMinutes)} – {formatMinutes(slot.EndMinutes)}</strong>
                              <span>{slot.Title}</span>
                              {slot.TeacherUserID ? <small>👤 {teacherLabel(slot.TeacherUserID)}</small> : null}
                              {slot.StudioID ? <small>📍 {studioName(slot.StudioID)}</small> : null}
                              {slot.ModalityID ? <small>🎭 {modalityName(slot.ModalityID)}</small> : null}
                            </button>
                            <button
                              type="button"
                              className="timetable-admin-slot-delete"
                              aria-label="Apagar bloco"
                              onClick={() => deleteSlot(slot)}
                              disabled={busy}
                            >
                              ✕
                            </button>
                          </article>
                        ))
                      )}
                      <button
                        type="button"
                        className="timetable-admin-add-slot"
                        onClick={() => openCreateSlot(day)}
                        disabled={busy}
                      >
                        + Bloco
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      </div>

      {mapDraft ? (
        <div className="modal-backdrop" onClick={() => !busy && setMapDraft(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{mapDraft.TimetableID ? 'Editar mapa' : 'Novo mapa'}</h3>
              <button type="button" className="icon-btn" onClick={() => setMapDraft(null)} disabled={busy}>
                Fechar
              </button>
            </div>
            {mapError ? <div className="soft-box error">{mapError}</div> : null}
            <div className="timetable-admin-form">
              <label>
                Nome do mapa / modalidade
                <input
                  list="timetable-modalities"
                  value={mapDraft.Label}
                  onChange={(e) => setMapDraft({ ...mapDraft, Label: e.target.value })}
                  placeholder="ex.: Ballet Clássico"
                />
                <datalist id="timetable-modalities">
                  {modalities.map((m) => (
                    <option key={m.id} value={m.name} />
                  ))}
                </datalist>
              </label>
              <label className="timetable-admin-check">
                <input
                  type="checkbox"
                  checked={mapDraft.IsActive}
                  onChange={(e) => setMapDraft({ ...mapDraft, IsActive: e.target.checked })}
                />
                Marcar como mapa ativo
              </label>
            </div>
            <div className="quick-actions">
              <button type="button" className="ghost-btn" onClick={() => setMapDraft(null)} disabled={busy}>
                Cancelar
              </button>
              <button type="button" className="timetable-admin-primary" onClick={saveMap} disabled={busy}>
                {busy ? 'A guardar…' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {slotDraft ? (
        <div className="modal-backdrop" onClick={() => !busy && setSlotDraft(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{slotDraft.SlotID ? 'Editar bloco' : 'Novo bloco'}</h3>
              <button type="button" className="icon-btn" onClick={() => setSlotDraft(null)} disabled={busy}>
                Fechar
              </button>
            </div>
            {slotError ? <div className="soft-box error">{slotError}</div> : null}
            <div className="timetable-admin-form timetable-admin-form-grid">
              <label>
                Dia da semana
                <select
                  value={slotDraft.DayOfWeek}
                  onChange={(e) => setSlotDraft({ ...slotDraft, DayOfWeek: Number(e.target.value) })}
                >
                  {DAYS.map((day) => (
                    <option key={day} value={day}>{dayLabel(day)}</option>
                  ))}
                </select>
              </label>
              <label>
                Título
                <input
                  value={slotDraft.Title}
                  onChange={(e) => setSlotDraft({ ...slotDraft, Title: e.target.value })}
                  placeholder="ex.: Ballet Iniciação"
                />
              </label>
              <label>
                Início
                <input
                  type="time"
                  value={minutesToTimeInput(slotDraft.StartMinutes)}
                  onChange={(e) => setSlotDraft({ ...slotDraft, StartMinutes: timeInputToMinutes(e.target.value) ?? slotDraft.StartMinutes })}
                />
              </label>
              <label>
                Fim
                <input
                  type="time"
                  value={minutesToTimeInput(slotDraft.EndMinutes)}
                  onChange={(e) => setSlotDraft({ ...slotDraft, EndMinutes: timeInputToMinutes(e.target.value) ?? slotDraft.EndMinutes })}
                />
              </label>
              <label>
                Professor <span className="timetable-admin-optional">(opcional)</span>
                <select
                  value={slotDraft.TeacherUserID}
                  onChange={(e) => setSlotDraft({ ...slotDraft, TeacherUserID: e.target.value })}
                >
                  <option value="">— Sem professor —</option>
                  {teachers.map((t) => (
                    <option key={t.userId} value={t.userId}>{teacherName(t)}</option>
                  ))}
                </select>
              </label>
              <label>
                Estúdio <span className="timetable-admin-optional">(opcional)</span>
                <select
                  value={slotDraft.StudioID}
                  onChange={(e) => setSlotDraft({ ...slotDraft, StudioID: e.target.value })}
                >
                  <option value="">— Sem estúdio —</option>
                  {studios.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </label>
              <label>
                Modalidade <span className="timetable-admin-optional">(opcional)</span>
                <select
                  value={slotDraft.ModalityID}
                  onChange={(e) => setSlotDraft({ ...slotDraft, ModalityID: e.target.value })}
                >
                  <option value="">— Sem modalidade —</option>
                  {modalities.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </label>
              <label>
                Cor
                <input
                  type="color"
                  value={slotDraft.Color || DEFAULT_COLOR}
                  onChange={(e) => setSlotDraft({ ...slotDraft, Color: e.target.value })}
                />
              </label>
              <label className="timetable-admin-form-wide">
                Notas
                <textarea
                  value={slotDraft.Notes}
                  onChange={(e) => setSlotDraft({ ...slotDraft, Notes: e.target.value })}
                  placeholder="Observações opcionais"
                />
              </label>
            </div>
            <div className="quick-actions">
              <button type="button" className="ghost-btn" onClick={() => setSlotDraft(null)} disabled={busy}>
                Cancelar
              </button>
              <button type="button" className="timetable-admin-primary" onClick={saveSlot} disabled={busy}>
                {busy ? 'A guardar…' : 'Guardar bloco'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </AdminShell>
  )
}

export default AdminTimetablesPage
