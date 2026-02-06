ALTER TABLE user_preferences 
ADD COLUMN IF NOT EXISTS active_view_id text;

COMMENT ON COLUMN user_preferences.active_view_id IS 'ID de la vista activa seleccionada por el usuario';
