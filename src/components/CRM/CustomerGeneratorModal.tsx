import { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  Database,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldCheck,
  ChevronRight,
  RefreshCw,
  Hash
} from 'lucide-react';
import {
  MODULES_2_TO_9,
  getNextProgressiveAccountNumber
} from '../../utils/customerAccountNumber';
import {
  generateModuleCustomers,
  generateAllModulesCustomers,
  GenerationProgress
} from '../../services/customerDatabaseGenerator';

interface CustomerGeneratorModalProps {
  initialSystemType?: string;
  onClose: () => void;
  onSuccess: () => void;
}

interface ModulePreview {
  key: string;
  label: string;
  prefix: string;
  moduleNum: number;
  nextAccount: string;
}

export function CustomerGeneratorModal({
  initialSystemType,
  onClose,
  onSuccess
}: CustomerGeneratorModalProps) {
  const [selectedTarget, setSelectedTarget] = useState<string>(
    initialSystemType && initialSystemType !== 'alarma' ? initialSystemType : 'all'
  );
  const [countPerModule, setCountPerModule] = useState<number>(5);
  const [loadingPreviews, setLoadingPreviews] = useState<boolean>(true);
  const [modulePreviews, setModulePreviews] = useState<ModulePreview[]>([]);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [progress, setProgress] = useState<GenerationProgress | null>(null);
  const [resultSummary, setResultSummary] = useState<{
    totalCreated: number;
    accounts: string[];
    errors: string[];
  } | null>(null);

  useEffect(() => {
    loadPreviews();
  }, []);

  const loadPreviews = async () => {
    setLoadingPreviews(true);
    try {
      const previews: ModulePreview[] = [];
      for (const mod of MODULES_2_TO_9) {
        const prog = await getNextProgressiveAccountNumber(mod.key);
        previews.push({
          key: mod.key,
          label: mod.label,
          prefix: mod.prefix,
          moduleNum: mod.moduleNum,
          nextAccount: prog.formattedAccount
        });
      }
      setModulePreviews(previews);
    } catch (err) {
      console.error('Error cargando previsualizaciones:', err);
    } finally {
      setLoadingPreviews(false);
    }
  };

  const handleStartGeneration = async () => {
    setIsGenerating(true);
    setProgress(null);
    setResultSummary(null);

    try {
      if (selectedTarget === 'all') {
        const res = await generateAllModulesCustomers(countPerModule, (prog) => {
          setProgress(prog);
        });

        const allAccounts: string[] = [];
        Object.values(res.moduleResults).forEach((m) => {
          allAccounts.push(...m.generatedAccounts);
        });

        setResultSummary({
          totalCreated: res.totalCreated,
          accounts: allAccounts,
          errors: res.summaryErrors
        });
      } else {
        const res = await generateModuleCustomers(selectedTarget, countPerModule, (prog) => {
          setProgress(prog);
        });

        setResultSummary({
          totalCreated: res.createdCount,
          accounts: res.generatedAccounts,
          errors: res.errors
        });
      }
    } catch (err) {
      console.error('Error durante la generación:', err);
      setResultSummary({
        totalCreated: 0,
        accounts: [],
        errors: [err instanceof Error ? err.message : 'Error inesperado']
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const percentProgress = progress ? Math.round((progress.current / progress.total) * 100) : 0;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-gray-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white p-6 relative flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-md">
                <Database className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold flex items-center gap-2">
                  Generador de Base de Datos de Clientes
                  <span className="text-xs bg-white/20 font-medium px-2 py-0.5 rounded-full text-blue-100">
                    Módulos 2 al 9
                  </span>
                </h3>
                <p className="text-sm text-blue-100 mt-0.5">
                  Generación automática con numeración alfanumérica consecutiva y prefijos
                </p>
              </div>
            </div>
            {!isGenerating && (
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Alarm Module Protection Notice */}
          <div className="mt-4 bg-emerald-500/20 border border-emerald-300/30 rounded-xl px-3.5 py-2.5 flex items-center gap-2.5 text-xs text-emerald-100">
            <ShieldCheck className="w-4 h-4 text-emerald-300 flex-shrink-0" />
            <span>
              <strong>Módulo 1 (Alarmas) protegido:</strong> Se conserva intacto con su base de datos y numeración original.
            </span>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {resultSummary ? (
            /* Resultados de la generación */
            <div className="space-y-5">
              <div className="text-center py-4">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h4 className="text-xl font-bold text-gray-900">
                  ¡Generación Completada con Éxito!
                </h4>
                <p className="text-sm text-gray-600 mt-1">
                  Se crearon <strong className="text-blue-600 font-bold">{resultSummary.totalCreated} clientes</strong> con sus números de cuenta consecutivos correspondientes.
                </p>
              </div>

              {resultSummary.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700 space-y-1">
                  <div className="font-bold flex items-center gap-1">
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    Advertencias durante la creación:
                  </div>
                  {resultSummary.errors.map((e, idx) => (
                    <div key={idx}>• {e}</div>
                  ))}
                </div>
              )}

              <div>
                <div className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                  <Hash className="w-4 h-4 text-blue-600" />
                  Cuentas Generadas ({resultSummary.accounts.length}):
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 max-h-48 overflow-y-auto flex flex-wrap gap-2">
                  {resultSummary.accounts.map((acc, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 bg-blue-100 text-blue-800 rounded-lg text-xs font-mono font-bold"
                    >
                      #{acc}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100 flex justify-end gap-3">
                <button
                  onClick={() => {
                    onSuccess();
                    onClose();
                  }}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors shadow-sm"
                >
                  Finalizar y Ver Clientes
                </button>
              </div>
            </div>
          ) : isGenerating ? (
            /* Estado de progreso */
            <div className="py-12 px-4 text-center space-y-5">
              <div className="relative w-20 h-20 mx-auto">
                <div className="w-20 h-20 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
                <Sparkles className="w-7 h-7 text-blue-600 absolute inset-0 m-auto animate-pulse" />
              </div>

              <div className="space-y-1">
                <h4 className="text-lg font-bold text-gray-900">
                  Generando clientes en el módulo {progress?.moduleLabel}...
                </h4>
                <p className="text-sm text-gray-600">
                  {progress ? `Asignando cuenta ${progress.accountNumber} a "${progress.customerName}"` : 'Iniciando proceso seguro...'}
                </p>
              </div>

              <div className="space-y-2 max-w-md mx-auto">
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${percentProgress}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-500 font-medium">
                  <span>Progreso: {percentProgress}%</span>
                  <span>{progress ? `${progress.current} de ${progress.total}` : ''}</span>
                </div>
              </div>
            </div>
          ) : (
            /* Formulario de configuración de generación */
            <div className="space-y-5">
              {/* Selección de Módulo */}
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  Seleccionar Módulo para Generación
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setSelectedTarget('all')}
                    className={`p-3 rounded-xl border text-left transition-all flex items-start justify-between ${
                      selectedTarget === 'all'
                        ? 'border-blue-600 bg-blue-50/70 ring-2 ring-blue-500/20'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-sm text-gray-900 flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-blue-600" />
                        Todos los módulos (2 al 9)
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Poblar CCTV, Acceso, Asistencia, Domótica, GPS, Red y Video Portero
                      </p>
                    </div>
                  </button>

                  {modulePreviews.map((mod) => (
                    <button
                      key={mod.key}
                      type="button"
                      onClick={() => setSelectedTarget(mod.key)}
                      className={`p-3 rounded-xl border text-left transition-all flex items-start justify-between ${
                        selectedTarget === mod.key
                          ? 'border-blue-600 bg-blue-50/70 ring-2 ring-blue-500/20'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div>
                        <div className="font-bold text-sm text-gray-900 flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-full bg-gray-100 text-gray-600 text-xs flex items-center justify-center font-bold">
                            {mod.moduleNum}
                          </span>
                          {mod.label}
                        </div>
                        <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                          <span>Prefijo: <strong className="font-mono text-blue-600">{mod.prefix}</strong></span>
                          <span>•</span>
                          <span>Siguiente: <strong className="font-mono text-gray-800">{mod.nextAccount}</strong></span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Cantidad de clientes por módulo */}
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  Cantidad de clientes a generar {selectedTarget === 'all' ? 'por cada módulo' : ''}
                </label>
                <div className="flex gap-3">
                  {[3, 5, 10].map((qty) => (
                    <button
                      key={qty}
                      type="button"
                      onClick={() => setCountPerModule(qty)}
                      className={`flex-1 py-2.5 px-4 rounded-xl border font-semibold text-sm transition-all ${
                        countPerModule === qty
                          ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
                          : 'border-gray-200 text-gray-700 bg-white hover:bg-gray-50'
                      }`}
                    >
                      {qty} clientes {selectedTarget === 'all' ? `(${qty * 8} tot.)` : ''}
                    </button>
                  ))}
                </div>
              </div>

              {/* Resumen previo */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-xs space-y-2">
                <div className="font-semibold text-gray-800 flex items-center justify-between">
                  <span>Resumen de Operación:</span>
                  <button
                    type="button"
                    onClick={loadPreviews}
                    className="text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Actualizar secuencias
                  </button>
                </div>
                <p className="text-gray-600 leading-relaxed">
                  Se generarán <strong>{selectedTarget === 'all' ? countPerModule * 8 : countPerModule}</strong> registros con datos verosímiles en México (nombres, razones sociales, colonias, coordenadas GPS, teléfonos y planes). Cada registro continuará de manera consecutiva a partir de la última cuenta utilizada para su prefijo, sin duplicados.
                </p>
              </div>

              {/* Botón de acción */}
              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium text-sm transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleStartGeneration}
                  disabled={loadingPreviews}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm transition-all shadow-md hover:shadow-lg flex items-center gap-2 disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4" />
                  Iniciar Generación
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
