import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Shield, AlertCircle, Wrench, TrendingUp, Eye, DollarSign, Calendar, Sparkles } from 'lucide-react';
import { AssetDetailView } from './AssetDetailView';
import type { Database } from '../../lib/database.types';

type Asset = Database['public']['Tables']['assets']['Row'] & {
  customers: { name: string; phone: string | null; address: string | null } | null;
  technicians: { full_name: string } | null;
  asset_service_analytics: Array<{
    opportunity_score: number;
    total_service_orders: number;
  }> | null;
};

export function AssetList() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'eol' | 'high_service'>('all');
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);

  useEffect(() => {
    loadAssets();
  }, [filter]);

  const loadAssets = async () => {
    let query = supabase
      .from('assets')
      .select(`
        *,
        customers:customers!assets_customer_id_fkey (name, phone, address),
        technicians (full_name),
        asset_service_analytics (opportunity_score, total_service_orders)
      `)
      .order('created_at', { ascending: false });

    if (filter === 'eol') {
      query = query.eq('is_eol', true);
    } else if (filter === 'active') {
      query = query.eq('status', 'active').eq('is_eol', false);
    } else if (filter === 'high_service') {
      query = query.gte('service_ticket_count', 3);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error loading assets:', error);
    } else {
      setAssets(data || []);
    }
    setLoading(false);
  };

  const isRecentlyInstalled = (installationDate: string | null): boolean => {
    if (!installationDate) return false;
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return new Date(installationDate) >= sevenDaysAgo;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const eolCount = assets.filter(a => a.is_eol).length;
  const activeCount = assets.filter(a => a.status === 'active' && !a.is_eol).length;
  const highServiceCount = assets.filter(a => (a.service_ticket_count || 0) >= 3).length;
  const totalServiceCost = assets.reduce((sum, a) => sum + (a.total_service_cost || 0), 0);
  const recentlyInstalledCount = assets.filter(a => isRecentlyInstalled(a.installation_date)).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-blue-100">Total Activos</span>
            <Shield className="w-5 h-5 text-blue-100" />
          </div>
          <p className="text-3xl font-bold">{assets.length}</p>
          {recentlyInstalledCount > 0 && (
            <p className="text-blue-200 text-sm mt-2">{recentlyInstalledCount} recién instalados</p>
          )}
        </div>

        <div className="bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-green-100">Activos</span>
            <Wrench className="w-5 h-5 text-green-100" />
          </div>
          <p className="text-3xl font-bold">{activeCount}</p>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-red-500 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-orange-100">End of Life</span>
            <AlertCircle className="w-5 h-5 text-orange-100" />
          </div>
          <p className="text-3xl font-bold">{eolCount}</p>
          <p className="text-orange-200 text-sm mt-2">Requieren reemplazo</p>
        </div>

        <div className="bg-gradient-to-br from-yellow-500 to-amber-500 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-yellow-100">Alto Servicio</span>
            <TrendingUp className="w-5 h-5 text-yellow-100" />
          </div>
          <p className="text-3xl font-bold">{highServiceCount}</p>
          <p className="text-yellow-200 text-sm mt-2">3+ tickets de servicio</p>
        </div>

        <div className="bg-gradient-to-br from-red-500 to-pink-500 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-red-100">Costo Servicio</span>
            <DollarSign className="w-5 h-5 text-red-100" />
          </div>
          <p className="text-3xl font-bold">${totalServiceCost.toFixed(0)}</p>
          <p className="text-red-200 text-sm mt-2">Oportunidad ahorro</p>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {(['all', 'active', 'eol', 'high_service'] as const).map((type) => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all ${filter === type
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
          >
            {type === 'all' ? 'Todos' :
              type === 'active' ? 'Activos' :
                type === 'eol' ? 'EOL' :
                  'Alto Servicio'}
          </button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {assets.map((asset) => {
          const opportunityScore = asset.asset_service_analytics?.[0]?.opportunity_score || 0;
          const hasHighOpportunity = opportunityScore >= 40;
          const recentlyInstalled = isRecentlyInstalled(asset.installation_date);

          return (
            <div
              key={asset.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-all cursor-pointer group"
              onClick={() => setSelectedAssetId(asset.id)}
            >
              <div className="flex items-start gap-3 mb-4">
                <div className={`p-2 rounded-lg ${recentlyInstalled ? 'bg-blue-100 text-blue-600' :
                  hasHighOpportunity ? 'bg-yellow-100 text-yellow-600' :
                    asset.is_eol ? 'bg-red-100 text-red-600' :
                      asset.status === 'active' ? 'bg-green-100 text-green-600' :
                        'bg-gray-100 text-gray-600'
                  }`}>
                  <Shield className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900">{asset.alarm_model}</h3>
                  <p className="text-sm text-gray-600 truncate">
                    {asset.customers?.name || 'Cliente desconocido'}
                  </p>
                </div>
                <div className="flex flex-col gap-1">
                  {recentlyInstalled && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-bold rounded-full flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      Nuevo
                    </span>
                  )}
                  {asset.is_eol && (
                    <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full">
                      EOL
                    </span>
                  )}
                  {hasHighOpportunity && !recentlyInstalled && (
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-bold rounded-full flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      Venta
                    </span>
                  )}
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <Eye className="w-5 h-5 text-blue-600" />
                </div>
              </div>

              <div className="space-y-2 text-sm">
                {asset.serial_number && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Serie:</span>
                    <span className="text-gray-900 font-medium">{asset.serial_number}</span>
                  </div>
                )}
                {(asset.service_ticket_count || 0) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tickets de Servicio:</span>
                    <span className="text-gray-900 font-bold">{asset.service_ticket_count}</span>
                  </div>
                )}
                {(asset.total_service_cost || 0) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Costo Total:</span>
                    <span className="text-red-600 font-semibold">${asset.total_service_cost?.toFixed(2)}</span>
                  </div>
                )}
                {asset.last_service_date && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Último Servicio:</span>
                    <span className="text-gray-900 font-medium flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(asset.last_service_date).toLocaleDateString()}
                    </span>
                  </div>
                )}
                {asset.installation_date && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Instalación:</span>
                    <span className={`font-medium ${recentlyInstalled ? 'text-blue-600' : 'text-gray-900'}`}>
                      {new Date(asset.installation_date).toLocaleDateString()}
                    </span>
                  </div>
                )}
                {asset.installation_cost !== null && asset.installation_cost !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Costo Equipo:</span>
                    <span className="text-gray-900 font-medium">${asset.installation_cost.toFixed(2)}</span>
                  </div>
                )}
                {asset.technicians?.full_name && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Instalado por:</span>
                    <span className="text-gray-900 font-medium truncate ml-2">{asset.technicians.full_name}</span>
                  </div>
                )}
              </div>

              {(asset.is_eol || hasHighOpportunity || asset.recommended_replacement_model || recentlyInstalled) && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  {recentlyInstalled && (
                    <div className="flex items-center gap-2 text-sm text-blue-600 mb-2">
                      <Sparkles className="w-4 h-4" />
                      <span className="font-semibold">Recién Instalado</span>
                    </div>
                  )}
                  {asset.is_eol && (
                    <div className="flex items-center gap-2 text-sm text-red-600 mb-2">
                      <AlertCircle className="w-4 h-4" />
                      <span className="font-semibold">Equipo Obsoleto (EOL)</span>
                    </div>
                  )}
                  {hasHighOpportunity && (
                    <div className="flex items-center gap-2 text-sm text-yellow-700 mb-2">
                      <TrendingUp className="w-4 h-4" />
                      <span className="font-semibold">Oportunidad: Score {opportunityScore}</span>
                    </div>
                  )}
                  {asset.recommended_replacement_model && (
                    <div className="text-xs text-gray-600">
                      <span className="font-medium">Reemplazo sugerido:</span> {asset.recommended_replacement_model}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {assets.length === 0 && (
        <div className="text-center py-12">
          <Shield className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No se encontraron activos</p>
        </div>
      )}

      {selectedAssetId && (
        <AssetDetailView
          assetId={selectedAssetId}
          onClose={() => setSelectedAssetId(null)}
          onUpdate={loadAssets}
        />
      )}
    </div>
  );
}
