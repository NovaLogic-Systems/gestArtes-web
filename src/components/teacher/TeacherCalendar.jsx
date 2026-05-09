
export default function TeacherCalendar ({ slots = [], proposed = new Set(), onToggle, onRequestException }) {
  const timeBlocks = []
  for (let h = 9; h <= 21; h++) {
    timeBlocks.push({ h, m: 0 })
    timeBlocks.push({ h, m: 30 })
  }
  const days = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
  
  const slotMap = new Map(
    slots.map(slot => [`${slot.day}:${slot.hour}:${slot.minute || 0}`, slot])
  )

  const renderCell = (day, h, m) => {
    const key = `${day}:${h}:${m}`
    const slot = slotMap.get(key)
    const isProposed = proposed.has(key)
    
    let className = 'availability-slot'
    let isUnavailable = false
    let btnText = 'Selecionar'
    let btnDisabled = false

    const isWeekday = day >= 0 && day <= 4
    const isSaturday = day === 5
    const isSunday = day === 6
    
    // Check if within operating hours (Mon-Fri 18:00-21:30, Sat 09:00-12:30)
    let isOutsideAllowedHours = false
    if (isWeekday && (h < 18 || (h === 21 && m > 30))) isOutsideAllowedHours = true
    if (isSaturday && (h < 9 || h > 12 || (h === 12 && m > 30))) isOutsideAllowedHours = true
    if (isSunday) isOutsideAllowedHours = true

    let isApprovedOrPending = false

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
        isApprovedOrPending = true
      }
      if (slot.status === 'approved') {
        className += ' approved'
        btnText = 'Aprovado'
        isApprovedOrPending = true
      }
    }

    if (isProposed) {
      className += ' selected'
      btnText = 'Selecionado'
    }
    
    const handleClick = () => {
      if (isUnavailable) return
      if (isApprovedOrPending && onRequestException) {
        onRequestException(day, h, m, slot)
      } else {
        onToggle({ day, hour: h, minute: m })
      }
    }
    
    return (
      <div className={className} data-availability-slot={!isUnavailable ? 'true' : undefined}>
        <button 
          className="ghost-btn" 
          type="button" 
          disabled={btnDisabled && !isApprovedOrPending}
          onClick={handleClick}
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
        {timeBlocks.map(({ h, m }) => (
          <tr key={`time-${h}-${m}`}>
            <th>{String(h).padStart(2, '0')}:{String(m).padStart(2, '0')}</th>
            {days.map((_, dayIdx) => (
              <td key={`${dayIdx}:${h}:${m}`}>
                {renderCell(dayIdx, h, m)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
