import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import {
  Play,
  Pause,
  CheckCircle2,
  MapPin,
  Clock,
  Loader2,
  AlertCircle,
  MapPinOff
} from 'lucide-react';

interface ServiceOrderActionsProps {
  orderId: string;
  status: string;
  isPaused: boolean;
  checkInTime: string | null;
  checkOutTime: string | null;
  onUpdate: () => void;
}

export function ServiceOrderActions({
  orderId,
  status,
  isPaused,
  checkInTime,
  checkOutTime,
  onUpdate
}: ServiceOrderActionsProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [gettingLocation, setGettingLocation] = useState(false);
  const [locationInfo, setLocationInfo] = useState<string>('');

  const getGeolocation = (): Promise<{ latitude: number; longitude: number } | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        () => {
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    });
  };

  const handleCheckIn = async () => {
    setLoading(true);
    setGettingLocation(true);
    setError('');
    setLocationInfo('');

    try {
      const location = await getGeolocation();
      setGettingLocation(false);

      const checkInTimestamp = new Date().toISOString();

      const updateData: any = {
        status: 'in_progress',
        check_in_time: checkInTimestamp,
        is_paused: false
      };

      if (location) {
        updateData.check_in_latitude = location.latitude;
        updateData.check_in_longitude = location.longitude;
        setLocationInfo('Check-in iniciado con ubicación GPS');
      } else {
        updateData.check_in_latitude = null;
        updateData.check_in_longitude = null;
        setLocationInfo('Check-in iniciado (ubicación GPS no disponible)');
      }

      const { error: updateError } = await supabase
        .from('service_orders')
        .update(updateData)
        .eq('id', orderId);

      if (updateError) throw updateError;

      const timeLogData: any = {
        service_order_id: orderId,
        action: 'check_in',
        timestamp: checkInTimestamp,
        notes: location
          ? 'Check-in automático con geolocalización'
          : 'Check-in automático sin geolocalización'
      };

      if (location) {
        timeLogData.latitude = location.latitude;
        timeLogData.longitude = location.longitude;
      }

      const { error: timeLogError } = await supabase.from('service_order_time_logs').insert([timeLogData]);

      if (timeLogError) {
        console.error('Error inserting time log:', timeLogError.message, timeLogError.code, timeLogError.details, timeLogError.hint);
      } else {
        console.log('✅ Time log inserted successfully:', timeLogData);
      }

      onUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error en check-in');
      setLocationInfo('');
    } finally {
      setLoading(false);
      setGettingLocation(false);
    }
  };

  const handlePause = async () => {
    setLoading(true);
    setError('');

    try {
      const pauseTimestamp = new Date().toISOString();

      const { error: updateError } = await supabase
        .from('service_orders')
        .update({
          is_paused: true,
          pause_reason: 'Pausado por técnico'
        })
        .eq('id', orderId);

      if (updateError) throw updateError;

      const { error: timeLogError } = await supabase.from('service_order_time_logs').insert([{
        service_order_id: orderId,
        action: 'pause',
        timestamp: pauseTimestamp,
        notes: 'Servicio pausado'
      }]);

      if (timeLogError) {
        console.error('Error inserting pause log:', timeLogError);
      } else {
        console.log('✅ Pause log inserted successfully');
      }

      onUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al pausar');
    } finally {
      setLoading(false);
    }
  };

  const handleResume = async () => {
    setLoading(true);
    setError('');

    try {
      const resumeTimestamp = new Date().toISOString();

      const { error: updateError } = await supabase
        .from('service_orders')
        .update({
          is_paused: false,
          pause_reason: null
        })
        .eq('id', orderId);

      if (updateError) throw updateError;

      const { error: timeLogError } = await supabase.from('service_order_time_logs').insert([{
        service_order_id: orderId,
        action: 'resume',
        timestamp: resumeTimestamp,
        notes: 'Servicio reanudado'
      }]);

      if (timeLogError) {
        console.error('Error inserting resume log:', timeLogError);
      } else {
        console.log('✅ Resume log inserted successfully');
      }

      onUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al reanudar');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setLoading(true);
    setGettingLocation(true);
    setError('');
    setLocationInfo('');

    try {
      const location = await getGeolocation();
      setGettingLocation(false);

      const checkOutTimestamp = new Date().toISOString();

      const checkInDate = checkInTime ? new Date(checkInTime) : new Date();
      const checkOutDate = new Date(checkOutTimestamp);
      const totalMinutes = Math.round((checkOutDate.getTime() - checkInDate.getTime()) / 60000);

      const updateData: any = {
        check_out_time: checkOutTimestamp,
        total_time_minutes: totalMinutes,
        is_paused: false
      };

      if (location) {
        updateData.check_out_latitude = location.latitude;
        updateData.check_out_longitude = location.longitude;
        setLocationInfo('Check-out completado con ubicación GPS');
      } else {
        updateData.check_out_latitude = null;
        updateData.check_out_longitude = null;
        setLocationInfo('Check-out completado (ubicación GPS no disponible)');
      }

      const { error: updateError } = await supabase
        .from('service_orders')
        .update(updateData)
        .eq('id', orderId);

      if (updateError) throw updateError;

      const timeLogData: any = {
        service_order_id: orderId,
        action: 'check_out',
        timestamp: checkOutTimestamp,
        notes: location
          ? `Check-out automático. Duración total: ${totalMinutes} minutos`
          : `Check-out automático sin geolocalización. Duración total: ${totalMinutes} minutos`
      };

      if (location) {
        timeLogData.latitude = location.latitude;
        timeLogData.longitude = location.longitude;
      }

      const { error: timeLogError } = await supabase.from('service_order_time_logs').insert([timeLogData]);

      if (timeLogError) {
        console.error('Error inserting check-out log:', timeLogError);
      } else {
        console.log('✅ Check-out log inserted successfully:', timeLogData);
      }

      onUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error en check-out');
      setLocationInfo('');
    } finally {
      setLoading(false);
      setGettingLocation(false);
    }
  };

  if (status === 'completed' || checkOutTime) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center gap-2 text-green-700">
          <CheckCircle2 className="w-5 h-5" />
          <span className="font-medium">Servicio completado</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {gettingLocation && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
          <MapPin className="w-4 h-4 animate-pulse" />
          Obteniendo ubicación GPS...
        </div>
      )}

      {locationInfo && (
        <div className={`border px-4 py-3 rounded-lg text-sm flex items-center gap-2 ${locationInfo.includes('no disponible')
          ? 'bg-yellow-50 border-yellow-200 text-yellow-800'
          : 'bg-green-50 border-green-200 text-green-700'
          }`}>
          {locationInfo.includes('no disponible') ? (
            <MapPinOff className="w-4 h-4" />
          ) : (
            <MapPin className="w-4 h-4" />
          )}
          {locationInfo}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        {!checkInTime && (
          <button
            onClick={handleCheckIn}
            disabled={loading}
            className="flex-1 min-w-[200px] px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium shadow-sm hover:shadow-md"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Procesando...
              </>
            ) : (
              <>
                <Play className="w-5 h-5" />
                Check-In (Iniciar)
              </>
            )}
          </button>
        )}

        {checkInTime && !checkOutTime && !isPaused && (
          <>
            <button
              onClick={handlePause}
              disabled={loading}
              className="flex-1 min-w-[150px] px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Pause className="w-5 h-5" />
                  Pausar
                </>
              )}
            </button>

            <button
              onClick={handleCheckOut}
              disabled={loading}
              className="flex-1 min-w-[150px] px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  Check-Out
                </>
              )}
            </button>
          </>
        )}

        {isPaused && (
          <button
            onClick={handleResume}
            disabled={loading}
            className="flex-1 min-w-[200px] px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Procesando...
              </>
            ) : (
              <>
                <Play className="w-5 h-5" />
                Reanudar Servicio
              </>
            )}
          </button>
        )}
      </div>

      {checkInTime && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-blue-700 mb-2">
            <Clock className="w-5 h-5" />
            <span className="font-medium">
              {isPaused ? 'Servicio Pausado' : 'Servicio en Progreso'}
            </span>
          </div>
          <p className="text-sm text-blue-600">
            Inicio: {new Date(checkInTime).toLocaleString()}
          </p>
        </div>
      )}
    </div>
  );
}
