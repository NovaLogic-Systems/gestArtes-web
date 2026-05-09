import React, { useState } from 'react';
import './UnavailabilityModal.css';

export default function UnavailabilityModal({ isOpen, onClose, onSubmit, slotData }) {
  const [reason, setReason] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ reason, slotData });
    setReason('');
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>Avisar indisponibilidade</h3>
        <p>Pretende cancelar o bloco selecionado? Por favor, indique o motivo abaixo.</p>
        
        <form onSubmit={handleSubmit} className="form-grid">
          <label>Motivo
            <textarea
              className="no-resize"
              rows={3}
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Descreva brevemente a razão da sua indisponibilidade pontual."
            />
          </label>

          <div className="quick-actions" style={{ marginTop: '16px' }}>
            <button type="submit" className="cta">Enviar Pedido</button>
            <button type="button" className="cta secondary" onClick={onClose}>Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  );
}
