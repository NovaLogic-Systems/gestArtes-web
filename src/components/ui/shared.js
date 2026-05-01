/**
 * @file src/components/ui/shared.js
 * @author NovaLogic System
 * @institution IPCA
 * @project GestArtes - Projeto 50+10 para Entartes
 */

export function cn(...parts) {
  return parts.filter(Boolean).join(' ')
}
