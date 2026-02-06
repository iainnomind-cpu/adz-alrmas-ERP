/*
  # Agregar tipo 'manual' a conceptos del calendario

  1. Cambios
    - Agregar tipo 'manual' a los tipos de conceptos permitidos
    - Esto permite crear conceptos personalizados sin una categoría predefinida

  2. Notas
    - El tipo 'manual' es útil para eventos personalizados o tareas especiales
    - No afecta los tipos existentes (appointment, quote, visit, consultation, follow_up)
*/

-- Modificar el constraint para incluir 'manual'
ALTER TABLE calendar_concepts DROP CONSTRAINT IF EXISTS calendar_concepts_concept_type_check;

ALTER TABLE calendar_concepts ADD CONSTRAINT calendar_concepts_concept_type_check 
  CHECK (concept_type IN ('appointment', 'quote', 'visit', 'consultation', 'follow_up', 'manual'));
