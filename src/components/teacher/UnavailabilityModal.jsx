import React, { useState } from 'react';
import './UnavailabilityModal.css';

export default function UnavailabilityModal({ isOpen, onClose, onSubmit, onCancel, slotData, viewOnly = false, details = null }) {
  const [reason, setReason] = useState('');
  const [manualDate, setManualDate] = useState('');
  const [manualStart, setManualStart] = useState('');
  const [manualEnd, setManualEnd] = useState('');

  if (!isOpen) return null;

  const status = slotData?.status?.toLowerCase() || slotData?.slot?.status?.toLowerCase() || '';
  const isPending = status === 'pending';
  const isApproved = status === 'approved';
  const isManual = !slotData && !viewOnly;

  const handleSubmit = (e) => {
    e.preventDefault();
    
    let finalSlotData = slotData;
    
    if (isManual) {
      const start = new Date(`${manualDate}T${manualStart}:00`);
      const end = new Date(`${manualDate}T${manualEnd}:00`);
      
      finalSlotData = {
        mode: 'semester',
        startDateTime: start.toISOString(),
        endDateTime: end.toISOString()
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

  const resetForm = () => {
    setReason('');
    setManualDate('');
    setManualStart('');
    setManualEnd('');
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
                  <p>{details?.startDate ? new Date(details.startDate).toLocaleString() : '—'}</p>
                </div>
                <div>
                  <label>Fim</label>
                  <p>{details?.endDate ? new Date(details.endDate).toLocaleString() : '—'}</p>
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
                    <input type="date" required value={manualDate} onChange={e => setManualDate(e.target.value)} />
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

