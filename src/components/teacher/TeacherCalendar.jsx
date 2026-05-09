
export default function TeacherCalendar ({ slots = [], proposed = new Set(), onToggle }) {
  const hourRange = Array.from({ length: 13 }, (_, i) => i + 8)
  const days = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
  
  const slotMap = new Map(
    slots.map(slot => [`${slot.day}:${slot.hour}`, slot])
  )

  const renderCell = (day, hour) => {
    const key = `${day}:${hour}`
    const slot = slotMap.get(key)
    const isProposed = proposed.has(key)
    
    let className = 'availability-slot'
    let isUnavailable = false
    let btnText = 'Selecionar'
    let btnDisabled = false

    const isWeekday = day >= 0 && day <= 4
    const isSaturday = day === 5
    const isSunday = day === 6
    
    let isOutsideAllowedHours = false
    if (isWeekday && hour < 18) isOutsideAllowedHours = true
    if (isSaturday && (hour < 9 || hour > 12)) isOutsideAllowedHours = true
    if (isSunday) isOutsideAllowedHours = true

    if (isOutsideAllowedHours) {
      className += ' unavailable'
      isUnavailable = true
      btnText = 'Indisponível'
      btnDisabled = true
    } else if (slot) {
      if (slot.status === 'blocked') {
        className += ' unavailable'
        isUnavailable = true
        btnText = 'Indisponível'
        btnDisabled = true
      }
      if (slot.status === 'pending') {
        className += ' pending'
        btnText = 'Pendente'
      }
      if (slot.status === 'approved') {
        className += ' approved'
        btnText = 'Aprovado'
      }
    }

    if (isProposed) {
      className += ' selected'
      btnText = 'Selecionado'
    }
    
    return (
      <div className={className} data-availability-slot={!isUnavailable ? 'true' : undefined}>
        <button 
          className="ghost-btn" 
          type="button" 
          disabled={btnDisabled}
          onClick={() => !isUnavailable ? onToggle({ day, hour }) : null}
        >
          {btnText}
        </button>
      </div>
    )
  }

  return (
    <table className='schedule-grid'>
      <thead>
        <tr>
          <th>Hora</th>
          {days.map(day => (
            <th key={day}>{day}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {hourRange.map(hour => (
          <tr key={`hour-${hour}`}>
            <th>{hour}:00</th>
            {days.map((_, dayIdx) => (
              <td key={`${dayIdx}:${hour}`}>
                {renderCell(dayIdx, hour)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
