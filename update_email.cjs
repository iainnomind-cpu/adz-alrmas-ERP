const fs = require('fs');
let code = fs.readFileSync('src/components/Settings/NotificationsManager.tsx', 'utf8');

// 1. Insert COMMON_VARIABLES before export function NotificationsManager() {
code = code.replace(
  'export function NotificationsManager() {',
  `export const COMMON_VARIABLES = [
  { key: 'customer_name', label: 'Nombre del Cliente' },
  { key: 'company_name', label: 'Nombre de la Empresa' },
  { key: 'account_number', label: 'No. de Cuenta' },
  { key: 'amount', label: 'Monto' },
  { key: 'due_date', label: 'Fecha de Vencimiento' },
  { key: 'service_date', label: 'Fecha de Servicio' },
  { key: 'technician_name', label: 'Nombre del Técnico' }
];

export function NotificationsManager() {`
);

// 2. Add states
code = code.replace(
  'const [showTemplateModal, setShowTemplateModal] = useState(false);',
  `const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [activeModalTab, setActiveModalTab] = useState<'editor' | 'preview'>('editor');
  const [draggedVariable, setDraggedVariable] = useState<string | null>(null);`
);

// 3. Update modals open
code = code.replace(
  /setShowTemplateModal\(true\);/g,
  `setActiveModalTab('editor');\n    setShowTemplateModal(true);`
);

// 4. Add drag and drop functions
code = code.replace(
  'const extractVariables = (text: string): string[] => {',
  `const handleDragStart = (e: React.DragEvent, variableKey: string) => {
    e.dataTransfer.setData('text/plain', \`{{\${variableKey}}}\`);
    setDraggedVariable(variableKey);
  };

  const handleDragEnd = () => {
    setDraggedVariable(null);
  };

  const handleDrop = (e: React.DragEvent, field: 'subject' | 'body') => {
    e.preventDefault();
    const data = e.dataTransfer.getData('text/plain');
    if (!data) return;

    setTemplateForm(prev => {
      const updated = { ...prev, [field]: prev[field] + data };
      
      const subjectVars = extractVariables(updated.subject);
      const bodyVars = extractVariables(updated.body);
      updated.variables = Array.from(new Set([...subjectVars, ...bodyVars]));
      
      return updated;
    });
  };

  const generatePreviewHtml = (htmlBody: string) => {
    // Replace variables with fake data for preview
    let previewBody = htmlBody;
    previewBody = previewBody.replace(/{{customer_name}}/g, 'Juan Pérez');
    previewBody = previewBody.replace(/{{company_name}}/g, 'Nuestra Empresa');
    previewBody = previewBody.replace(/{{account_number}}/g, 'CTA-12345');
    previewBody = previewBody.replace(/{{amount}}/g, '$1,500.00');
    previewBody = previewBody.replace(/{{due_date}}/g, '30 de Noviembre, 2026');
    previewBody = previewBody.replace(/{{service_date}}/g, '25 de Noviembre, 2026');
    previewBody = previewBody.replace(/{{technician_name}}/g, 'Carlos Gómez');
    
    // Replace newline with br
    previewBody = previewBody.replace(/\\n/g, '<br/>');

    return \`
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9fafb; padding: 20px; border-radius: 8px;">
        <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); border: 1px solid #e5e7eb;">
          <div style="text-align: center; margin-bottom: 24px; padding-bottom: 20px; border-bottom: 2px solid #f3f4f6;">
            <div style="display: inline-flex; align-items: center; justify-content: center; width: 48px; height: 48px; background-color: #2563eb; color: white; border-radius: 12px; font-weight: bold; font-size: 24px;">
              LOGO
            </div>
          </div>
          <div style="color: #374151; font-size: 16px; line-height: 1.6;">
            \${previewBody}
          </div>
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #f3f4f6; text-align: center; color: #9ca3af; font-size: 12px;">
            Este es un correo automático, por favor no responda a este mensaje.<br/>
            © 2026 Nuestra Empresa. Todos los derechos reservados.
          </div>
        </div>
      </div>
    \`;
  };

  const extractVariables = (text: string): string[] => {`
);

// 5. Update the UI for the modal
const oldModalTop = `<div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900">
                {editingTemplate ? 'Editar Plantilla' : 'Nueva Plantilla'}
              </h3>
              <button
                onClick={() => setShowTemplateModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">`;

const newModalTop = `<div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-900">
                  {editingTemplate ? 'Editar Plantilla' : 'Nueva Plantilla'}
                </h3>
                <button
                  onClick={() => setShowTemplateModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex gap-4 border-b border-gray-200">
                <button
                  onClick={() => setActiveModalTab('editor')}
                  className={\`pb-2 px-2 font-medium transition-colors \${activeModalTab === 'editor' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}\`}
                >
                  Editor
                </button>
                <button
                  onClick={() => setActiveModalTab('preview')}
                  className={\`pb-2 px-2 font-medium transition-colors \${activeModalTab === 'preview' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}\`}
                >
                  Vista Previa
                </button>
              </div>
            </div>

            <div className="p-0">
              {activeModalTab === 'preview' ? (
                <div className="p-6 bg-gray-50 min-h-[400px]">
                  <div className="mb-4 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                    <p className="text-sm text-gray-500 mb-1"><strong>Asunto:</strong> {templateForm.subject.replace(/{{customer_name}}/g, 'Juan Pérez')}</p>
                  </div>
                  <div dangerouslySetInnerHTML={{ __html: generatePreviewHtml(templateForm.body) }} />
                </div>
              ) : (
                <div className="flex flex-col md:flex-row min-h-[500px]">
                  {/* Editor Side */}
                  <div className="flex-1 p-6 space-y-6">`;

code = code.replace(oldModalTop, newModalTop);

// 6. Fix the closing tags for the new flex container and Editor Side
const oldModalBottom = `              {/* Estado Activo */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={templateForm.is_active}
                  onChange={(e) => updateTemplateField('is_active', e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                  Plantilla Activa
                </label>
              </div>
            </div>

            {/* Footer */}`;

const newModalBottom = `              {/* Estado Activo */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={templateForm.is_active}
                  onChange={(e) => updateTemplateField('is_active', e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                  Plantilla Activa
                </label>
              </div>
                  </div>

                  {/* Variables Sidebar */}
                  <div className="w-full md:w-64 bg-gray-50 p-6 border-l border-gray-200">
                    <h4 className="font-semibold text-gray-900 mb-4 text-sm uppercase tracking-wider">
                      Variables Disponibles
                    </h4>
                    <p className="text-xs text-gray-500 mb-4">
                      Arrastra y suelta las variables al asunto o al cuerpo del correo.
                    </p>
                    <div className="space-y-2">
                      {COMMON_VARIABLES.map(variable => (
                        <div
                          key={variable.key}
                          draggable
                          onDragStart={(e) => handleDragStart(e, variable.key)}
                          onDragEnd={handleDragEnd}
                          className="px-3 py-2 bg-white border border-blue-200 text-blue-700 rounded-lg text-xs font-mono cursor-grab hover:bg-blue-50 hover:border-blue-300 transition-colors flex flex-col"
                        >
                          <span className="font-semibold mb-1">{variable.label}</span>
                          <span className="text-gray-500">{'{{' + variable.key + '}}'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}`;

code = code.replace(oldModalBottom, newModalBottom);

// 7. Add drag over and drop handlers to inputs
code = code.replace(
  'onChange={(e) => updateTemplateField(\'subject\', e.target.value)}',
  `onChange={(e) => updateTemplateField('subject', e.target.value)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleDrop(e, 'subject')}`
);

code = code.replace(
  'onChange={(e) => updateTemplateField(\'body\', e.target.value)}',
  `onChange={(e) => updateTemplateField('body', e.target.value)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleDrop(e, 'body')}`
);

fs.writeFileSync('src/components/Settings/NotificationsManager.tsx', code);
console.log('Script completed successfully');
