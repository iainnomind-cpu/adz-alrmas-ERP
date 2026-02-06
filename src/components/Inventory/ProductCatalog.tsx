import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Package, Plus, Edit2, AlertCircle, TrendingUp, TrendingDown } from 'lucide-react';
import { NewProductForm } from './NewProductForm';

interface Product {
  id: string;
  sku: string;
  name: string;
  brand: string | null;
  model: string | null;
  unit_cost: number;
  selling_price: number;
  min_stock_level: number;
  reorder_point: number;
  is_active: boolean;
  inventory_categories: { name: string } | null;
  inventory_stock: Array<{ quantity_available: number; average_cost: number }>;
}

export function ProductCatalog() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'low_stock' | 'out_of_stock'>('all');
  const [showNewForm, setShowNewForm] = useState(false);

  useEffect(() => {
    loadProducts();
  }, [filter]);

  const loadProducts = async () => {
    let query = supabase
      .from('inventory_products')
      .select(`
        *,
        inventory_categories (name),
        inventory_stock (quantity_available, average_cost)
      `)
      .eq('is_active', true)
      .order('name');

    const { data, error } = await query;

    if (error) {
      console.error('Error loading products:', error);
    } else {
      let filteredData = data || [];

      if (filter === 'low_stock') {
        filteredData = filteredData.filter(p => {
          const stock = p.inventory_stock?.[0]?.quantity_available || 0;
          return stock > 0 && stock <= p.reorder_point;
        });
      } else if (filter === 'out_of_stock') {
        filteredData = filteredData.filter(p => {
          const stock = p.inventory_stock?.[0]?.quantity_available || 0;
          return stock === 0;
        });
      }

      setProducts(filteredData);
    }
    setLoading(false);
  };

  const getStockStatus = (product: Product) => {
    const stock = product.inventory_stock?.[0]?.quantity_available || 0;
    if (stock === 0) return { color: 'bg-red-100 text-red-800', label: 'Sin Stock', icon: AlertCircle };
    if (stock <= product.reorder_point) return { color: 'bg-orange-100 text-orange-800', label: 'Stock Bajo', icon: TrendingDown };
    return { color: 'bg-green-100 text-green-800', label: 'Stock OK', icon: TrendingUp };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {(['all', 'low_stock', 'out_of_stock'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all ${
                filter === type
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {type === 'all' ? 'Todos' : type === 'low_stock' ? 'Stock Bajo' : 'Sin Stock'}
            </button>
          ))}
        </div>

        <button
          onClick={() => setShowNewForm(true)}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all flex items-center gap-2 font-medium shadow-sm hover:shadow-md"
        >
          <Plus className="w-5 h-5" />
          Nuevo Producto
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {products.map((product) => {
          const stock = product.inventory_stock?.[0]?.quantity_available || 0;
          const avgCost = product.inventory_stock?.[0]?.average_cost || 0;
          const status = getStockStatus(product);
          const StatusIcon = status.icon;

          return (
            <div
              key={product.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-all group"
            >
              <div className="flex items-start gap-3 mb-4">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                  <Package className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">{product.name}</h3>
                  <p className="text-sm text-gray-600">{product.sku}</p>
                </div>
                <button className="opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-gray-100 rounded-lg">
                  <Edit2 className="w-4 h-4 text-gray-600" />
                </button>
              </div>

              {(product.brand || product.model) && (
                <div className="mb-3 text-sm text-gray-600">
                  {product.brand} {product.model}
                </div>
              )}

              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Stock Disponible:</span>
                  <span className="font-semibold text-gray-900">{stock} unidades</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Punto de Reorden:</span>
                  <span className="font-medium text-gray-700">{product.reorder_point}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Costo Promedio:</span>
                  <span className="font-medium text-gray-900">${avgCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Precio Venta:</span>
                  <span className="font-semibold text-green-600">${product.selling_price.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                {product.inventory_categories && (
                  <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">
                    {product.inventory_categories.name}
                  </span>
                )}
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
                  <StatusIcon className="w-3 h-3" />
                  {status.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {products.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">No hay productos en esta categoría</p>
        </div>
      )}

      {showNewForm && (
        <NewProductForm
          onClose={() => setShowNewForm(false)}
          onSuccess={() => {
            loadProducts();
            setShowNewForm(false);
          }}
        />
      )}
    </div>
  );
}
