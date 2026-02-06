import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Camera, Upload, X, Image as ImageIcon, Trash2 } from 'lucide-react';

interface Photo {
  id: string;
  photo_url: string;
  photo_description: string | null;
  photo_type: string;
  display_order: number;
  created_at: string;
}

interface ServiceOrderPhotosProps {
  serviceOrderId: string;
  readOnly?: boolean;
  onPhotoUpdate?: () => void;
}

export function ServiceOrderPhotos({ serviceOrderId, readOnly = false, onPhotoUpdate }: ServiceOrderPhotosProps) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);

  useEffect(() => {
    loadPhotos();
  }, [serviceOrderId]);

  const loadPhotos = async () => {
    const { data, error } = await supabase
      .from('service_order_photos')
      .select('*')
      .eq('service_order_id', serviceOrderId)
      .order('display_order', { ascending: true });

    if (data) setPhotos(data);
    setLoading(false);
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor seleccione una imagen válida');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('La imagen no debe superar 5MB');
      return;
    }

    setUploading(true);

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const nextOrder = photos.length > 0 ? Math.max(...photos.map(p => p.display_order)) + 1 : 0;

        const { error } = await supabase
          .from('service_order_photos')
          .insert([{
            service_order_id: serviceOrderId,
            photo_url: base64String,
            photo_type: 'evidence',
            display_order: nextOrder,
            uploaded_by: user.id
          }]);

        if (!error) {
          // Log activity to history
          await supabase.from('service_order_status_history').insert([{
            service_order_id: serviceOrderId,
            previous_status: 'activity',
            new_status: 'photo_added',
            reason: 'Se agregó una fotografía de evidencia'
          }]);
          loadPhotos();
          if (onPhotoUpdate) onPhotoUpdate();
        } else {
          alert('Error al subir la foto');
        }
      };

      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading photo:', error);
      alert('Error al subir la foto');
    } finally {
      setUploading(false);
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    if (!confirm('¿Está seguro de eliminar esta foto?')) return;

    const { error } = await supabase
      .from('service_order_photos')
      .delete()
      .eq('id', photoId);

    if (!error) {
      loadPhotos();
      if (onPhotoUpdate) onPhotoUpdate();
    }
  };

  const updatePhotoDescription = async (photoId: string, description: string) => {
    const { error } = await supabase
      .from('service_order_photos')
      .update({ photo_description: description })
      .eq('id', photoId);

    if (!error) {
      setPhotos(prev => prev.map(p =>
        p.id === photoId ? { ...p, photo_description: description } : p
      ));
      if (onPhotoUpdate) onPhotoUpdate();
    }
  };

  const getPhotoTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      before: 'Antes',
      during: 'Durante',
      after: 'Después',
      evidence: 'Evidencia',
      damage: 'Daño',
      repair: 'Reparación',
      other: 'Otro'
    };
    return labels[type] || type;
  };

  const getPhotoTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      before: 'bg-blue-100 text-blue-800',
      during: 'bg-yellow-100 text-yellow-800',
      after: 'bg-green-100 text-green-800',
      evidence: 'bg-purple-100 text-purple-800',
      damage: 'bg-red-100 text-red-800',
      repair: 'bg-teal-100 text-teal-800',
      other: 'bg-gray-100 text-gray-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Camera className="w-5 h-5" />
          Evidencias Fotográficas ({photos.length})
        </h3>

        {!readOnly && (
          <label className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer flex items-center gap-2">
            <Upload className="w-4 h-4" />
            {uploading ? 'Subiendo...' : 'Subir Foto'}
            <input
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              disabled={uploading}
              className="hidden"
            />
          </label>
        )}
      </div>

      {photos.length === 0 ? (
        <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No hay fotos registradas</p>
          {!readOnly && (
            <p className="text-sm mt-1">Haga clic en "Subir Foto" para agregar evidencias</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {photos.map((photo) => (
            <div key={photo.id} className="relative group">
              <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 border-2 border-gray-200 hover:border-blue-400 transition-colors">
                <img
                  src={photo.photo_url}
                  alt={photo.photo_description || 'Evidencia'}
                  className="w-full h-full object-cover cursor-pointer"
                  onClick={() => setSelectedPhoto(photo)}
                />
              </div>

              <div className="absolute top-2 left-2">
                <span className={`px-2 py-1 rounded text-xs font-medium ${getPhotoTypeColor(photo.photo_type)}`}>
                  {getPhotoTypeLabel(photo.photo_type)}
                </span>
              </div>

              {!readOnly && (
                <button
                  onClick={() => handleDeletePhoto(photo.id)}
                  className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}

              {photo.photo_description && (
                <p className="mt-1 text-xs text-gray-600 line-clamp-2">
                  {photo.photo_description}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {selectedPhoto && (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4">
          <div className="relative max-w-5xl w-full">
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute -top-12 right-0 p-2 text-white hover:bg-white/20 rounded-lg"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="bg-white rounded-lg overflow-hidden">
              <img
                src={selectedPhoto.photo_url}
                alt={selectedPhoto.photo_description || 'Evidencia'}
                className="w-full max-h-[70vh] object-contain"
              />

              <div className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getPhotoTypeColor(selectedPhoto.photo_type)}`}>
                    {getPhotoTypeLabel(selectedPhoto.photo_type)}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(selectedPhoto.created_at).toLocaleString('es-MX')}
                  </span>
                </div>

                {!readOnly ? (
                  <textarea
                    value={selectedPhoto.photo_description || ''}
                    onChange={(e) => updatePhotoDescription(selectedPhoto.id, e.target.value)}
                    placeholder="Agregar descripción..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={2}
                  />
                ) : selectedPhoto.photo_description ? (
                  <p className="text-sm text-gray-600">{selectedPhoto.photo_description}</p>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
