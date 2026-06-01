import React, { useRef, useState } from 'react';
import './UnavailabilityModal.css';

export default function UnavailabilityModal({ isOpen, onClose, onSubmit, onCancel, slotData, viewOnly = false, details = null }) {
  const [reason, setReason] = useState('');
  const [manualDate, setManualDate] = useState('');
  const [manualDateDisplay, setManualDateDisplay] = useState('');
  const [manualStart, setManualStart] = useState('');
  const [manualEnd, setManualEnd] = useState('');
  const [formError, setFormError] = useState('');
  const dateInputRef = useRef(null);

  if (!isOpen) return null;

  const status = slotData?.status?.toLowerCase() || slotData?.slot?.status?.toLowerCase() || '';
  const isPending = status === 'pending';
  const isApproved = status === 'approved';
  const isManual = !slotData && !viewOnly;
  const todayIso = new Date().toISOString().slice(0, 10);

  const formatDisplayDate = (value) => {
    if (!value) {
      return '';
    }

    const [year, month, day] = value.split('-');
    if (!year || !month || !day) {
      return '';
    }

    return `${day}-${month}-${year}`;
  };

  const parseDisplayDate = (value) => {
    const match = value.trim().match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/);
    if (!match) {
      return '';
    }

    const [, day, month, year] = match;
    const parsed = new Date(Number(year), Number(month) - 1, Number(day));

    if (
      Number.isNaN(parsed.getTime()) ||
      parsed.getFullYear() !== Number(year) ||
      parsed.getMonth() !== Number(month) - 1 ||
      parsed.getDate() !== Number(day)
    ) {
      return '';
    }

    return `${year}-${month}-${day}`;
  };

  const openNativeDatePicker = () => {
    const input = dateInputRef.current;

    if (!input) {
      return;
    }

    if (typeof input.showPicker === 'function') {
      input.showPicker();
      return;
    }

    input.click();
  };

  const handleManualDateChange = (event) => {
    const nextValue = event.target.value;
    setManualDateDisplay(nextValue);

    const parsed = parseDisplayDate(nextValue);
    setManualDate(parsed);

    if (dateInputRef.current && parsed) {
      dateInputRef.current.value = parsed;
    }
  };

  const handleNativeDateChange = (event) => {
    const nextValue = event.target.value;
    setManualDate(nextValue);
    setManualDateDisplay(formatDisplayDate(nextValue));
  };

  const handleManualDateBlur = () => {
    if (!manualDateDisplay) {
      setManualDate('');
      return;
    }

    const parsed = parseDisplayDate(manualDateDisplay);
    if (!parsed) {
      setManualDate('');
      setManualDateDisplay('');
      return;
    }

    setManualDate(parsed);
    setManualDateDisplay(formatDisplayDate(parsed));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    let finalSlotData = slotData;
    
    if (isManual) {
      if (!manualDate || manualDate < todayIso || !manualStart || !manualEnd) {
        setFormError('Escolha uma data futura e um intervalo horário válido.');
        return
      }

      finalSlotData = {
        mode: 'semester',
        startDateTime: `${manualDate}T${manualStart}:00.000Z`,
        endDateTime: `${manualDate}T${manualEnd}:00.000Z`
      };
    }

    onSubmit({ reason, slotData: finalSlotData });
    resetForm();
  };

  const handleCancelRequest = () => {
    const id = slotData?.availabilityId ?? slotData?.slot?.availabilityId ?? slotData?.id;
    if (onCancel && id) {
      onCancel(id);
    }
  };

  const pendingReason = slotData?.reason ? `"${slotData.reason}"` : 'Sem motivo especificado.';

  const formatDateTime = (value) => {
    if (!value) {
      return '—';
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return '—';
    }

    return parsed.toLocaleString('pt-PT', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  };

  const resetForm = () => {
    setReason('');
    setManualDate('');
    setManualDateDisplay('');
    setManualStart('');
    setManualEnd('');
    setFormError('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content glass-modal">
        <div className="modal-header">
          <div 
            className="modal-icon" 
            style={{ background: isPending ? '#ef4444' : (isApproved ? '#10b981' : '#f59e0b') }}
          >
            {viewOnly ? 'i' : (isPending ? '?' : '!')}
          </div>
          <h3>
            {viewOnly 
              ? 'Detalhes da Indisponibilidade' 
              : (isPending ? 'Remover pedido pendente?' : (isApproved ? 'Aviso de indisponibilidade' : (isManual ? 'Reportar Ausência' : 'Indisponibilidade')))
            }
          </h3>
        </div>
        
        <div className="modal-body">
          <p className={`modal-description ${isPending ? 'pending' : ''}`}>
            {viewOnly 
              ? 'Informações sobre o pedido de ausência registado no sistema.'
              : (isPending
                  ? 'Este pedido ainda está pendente. Se o remover, deixará de ficar disponível para validação da coordenação.'
                  : (isManual 
                      ? 'Indique a data e o intervalo da sua ausência pontual para validação.'
                      : 'Pretende cancelar o bloco aprovado? Indique o motivo para que a coordenação possa validar a sua ausência.'
                    )
                )
            }
          </p>
          
          {viewOnly ? (
            <div className="view-details">
              <div className="detail-item">
                <label>Motivo</label>
                <div className="detail-value">{details?.reason || details?.Reason || '—'}</div>
              </div>
              <div className="detail-grid">
                <div>
                  <label>Início</label>
                  <p>{formatDateTime(details?.startDate)}</p>
                </div>
                <div>
                  <label>Fim</label>
                  <p>{formatDateTime(details?.endDate)}</p>
                </div>
              </div>
              <div className="detail-item">
                <label>Estado</label>
                <span className={`status-pill ${String(details?.status || '').toLowerCase()}`}>
                  {details?.status || '—'}
                </span>
              </div>
              {details?.reviewNotes && (
                <div className="detail-item review-notes" style={{ marginTop: '12px' }}>
                  <label>Notas da Revisão</label>
                  <p style={{ fontStyle: 'italic' }}>{details.reviewNotes}</p>
                </div>
              )}
              <div className="modal-footer">
                <button type="button" className="cta secondary" onClick={handleClose}>Fechar</button>
              </div>
            </div>
          ) : isPending ? (
            <div className="pending-confirmation">
              <div className="pending-summary-card">
                <span className="pending-summary-label">Motivo enviado</span>
                <p className="pending-summary-text">{pendingReason}</p>
              </div>

              <div className="modal-footer pending-footer">
                <button type="button" className="cta secondary" onClick={handleClose}>
                  Manter pedido
                </button>
                <button type="button" className="cta danger-outline" onClick={handleCancelRequest}>
                  Sim, remover pedido
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="modal-form">
              {isManual && (
                <div className="manual-fields">
                  <div className="form-group">
                    <label>Data da Ausência</label>
                    <div className="date-picker-field">
                      <input
                        type="text"
                        required
                        inputMode="numeric"
                        placeholder="DD-MM-AAAA"
                        value={manualDateDisplay}
                        onChange={handleManualDateChange}
                        onBlur={handleManualDateBlur}
                      />
                      <button
                        type="button"
                        className="date-picker-button"
                        onClick={openNativeDatePicker}
                        aria-label="Abrir calendário"
                      >
                        <span aria-hidden="true">📅</span>
                      </button>
                      <input
                        ref={dateInputRef}
                        className="native-date-input"
                        type="date"
                        min={todayIso}
                        tabIndex={-1}
                        aria-hidden="true"
                        value={manualDate}
                        onChange={handleNativeDateChange}
                      />
                    </div>
                  </div>
                  <div className="time-row">
                    <div className="form-group">
                      <label>Início</label>
                      <input type="time" required value={manualStart} onChange={e => setManualStart(e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label>Fim</label>
                      <input type="time" required value={manualEnd} onChange={e => setManualEnd(e.target.value)} />
                    </div>
                  </div>
                </div>
              )}

              <div className="form-group">
                <label htmlFor="reason-textarea">Motivo da ausência</label>
                <textarea
                  id="reason-textarea"
                  className="no-resize"
                  rows={3}
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Ex: Doença, compromisso inadiável, etc..."
                />
              </div>

              {formError ? <p className="modal-form-error">{formError}</p> : null}

              <div className="modal-footer" style={{ justifyContent: 'flex-end', marginTop: '24px' }}>
                <button type="button" className="cta secondary" onClick={handleClose}>
                  Cancelar
                </button>
                <button type="submit" className="cta">
                  Enviar Pedido
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
