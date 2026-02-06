import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { UserCheck, Wrench, Clock, TrendingUp, Award } from 'lucide-react';

interface TechnicianMetrics {
  id: string;
  fullName: string;
  specialty: string | null;
  totalServices: number;
  completedServices: number;
  avgTime: number;
  totalRevenue: number;
  servicesLast30Days: number;
  servicesPerDay: number;
}

export function TechnicianProductivity() {
  const [technicians, setTechnicians] = useState<TechnicianMetrics[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProductivity();
  }, []);

  const loadProductivity = async () => {
    try {
      const [techsData, ordersData] = await Promise.all([
        supabase.from('technicians').select('*').eq('is_active', true),
        supabase.from('service_orders').select('*')
      ]);

      const techs = techsData.data || [];
      const orders = ordersData.data || [];

      const metrics = techs.map(tech => {
        const techOrders = orders.filter(o => o.technician_id === tech.id);
        const completed = techOrders.filter(o => o.status === 'completed');
        const last30Days = techOrders.filter(o => {
          const orderDate = new Date(o.created_at);
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          return orderDate >= thirtyDaysAgo;
        });

        const avgTime = completed.length > 0
          ? completed.reduce((sum, o) => sum + (o.total_time_minutes || 0), 0) / completed.length
          : 0;

        const totalRevenue = completed.reduce((sum, o) => sum + (o.total_cost || 0), 0);

        return {
          id: tech.id,
          fullName: tech.full_name,
          specialty: tech.specialty,
          totalServices: techOrders.length,
          completedServices: completed.length,
          avgTime: Math.round(avgTime),
          totalRevenue,
          servicesLast30Days: last30Days.length,
          servicesPerDay: Number((last30Days.length / 30).toFixed(2))
        };
      });

      metrics.sort((a, b) => b.totalRevenue - a.totalRevenue);
      setTechnicians(metrics);
    } catch (error) {
      console.error('Error loading productivity:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
  }

  const topPerformer = technicians[0];

  return (
    <div className="space-y-6">
      {topPerformer && (
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Award className="w-6 h-6" />
                <h3 className="text-lg font-semibold">Técnico Destacado</h3>
              </div>
              <p className="text-3xl font-bold mb-2">{topPerformer.fullName}</p>
              <p className="text-sm opacity-90">{topPerformer.specialty || 'Técnico General'}</p>
              <div className="mt-4 grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm opacity-75">Servicios</p>
                  <p className="text-2xl font-bold">{topPerformer.completedServices}</p>
                </div>
                <div>
                  <p className="text-sm opacity-75">Ingresos</p>
                  <p className="text-2xl font-bold">${topPerformer.totalRevenue.toFixed(0)}</p>
                </div>
                <div>
                  <p className="text-sm opacity-75">Serv/Día</p>
                  <p className="text-2xl font-bold">{topPerformer.servicesPerDay}</p>
                </div>
              </div>
            </div>
            <Award className="w-24 h-24 opacity-20" />
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Técnico</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Total</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Completados</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Últimos 30d</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Serv/Día</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Tiempo Prom.</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ingresos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {technicians.map((tech, index) => (
                <tr key={tech.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {index < 3 && (
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          index === 0 ? 'bg-yellow-100 text-yellow-600' :
                          index === 1 ? 'bg-gray-100 text-gray-600' :
                          'bg-orange-100 text-orange-600'
                        }`}>
                          {index + 1}
                        </div>
                      )}
                      <div>
                        <div className="font-medium text-gray-900">{tech.fullName}</div>
                        {tech.specialty && (
                          <div className="text-sm text-gray-500">{tech.specialty}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="font-semibold text-gray-900">{tech.totalServices}</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="font-semibold text-green-600">{tech.completedServices}</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="font-semibold text-blue-600">{tech.servicesLast30Days}</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="font-semibold text-orange-600">{tech.servicesPerDay}</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="font-semibold text-gray-900">{tech.avgTime} min</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="font-semibold text-gray-900">${tech.totalRevenue.toFixed(2)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
