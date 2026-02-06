import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { MessageSquare, Send, Clock } from 'lucide-react';

interface Comment {
  id: string;
  comment_type: string;
  comment_text: string;
  is_internal: boolean;
  created_at: string;
  created_by: string | null;
}

interface ServiceOrderCommentsProps {
  serviceOrderId: string;
  readOnly?: boolean;
}

export function ServiceOrderComments({ serviceOrderId, readOnly = false }: ServiceOrderCommentsProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState({
    comment_text: '',
    comment_type: 'general',
    is_internal: false
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadComments();
  }, [serviceOrderId]);

  const loadComments = async () => {
    const { data, error } = await supabase
      .from('service_order_comments')
      .select('*')
      .eq('service_order_id', serviceOrderId)
      .order('created_at', { ascending: true });

    if (data) setComments(data);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.comment_text.trim()) return;

    setSubmitting(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('service_order_comments')
      .insert([{
        service_order_id: serviceOrderId,
        ...newComment,
        created_by: user.id
      }]);

    if (!error) {
      setNewComment({
        comment_text: '',
        comment_type: 'general',
        is_internal: false
      });
      loadComments();
    }

    setSubmitting(false);
  };

  const getCommentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      general: 'General',
      technical: 'Técnico',
      internal: 'Interno',
      customer: 'Cliente',
      admin: 'Administración'
    };
    return labels[type] || type;
  };

  const getCommentTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      general: 'bg-blue-100 text-blue-800',
      technical: 'bg-orange-100 text-orange-800',
      internal: 'bg-gray-100 text-gray-800',
      customer: 'bg-green-100 text-green-800',
      admin: 'bg-purple-100 text-purple-800'
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
      <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
        <MessageSquare className="w-5 h-5" />
        Comentarios y Observaciones ({comments.length})
      </h3>

      {!readOnly && (
        <form onSubmit={handleSubmit} className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de Comentario
              </label>
              <select
                value={newComment.comment_type}
                onChange={(e) => setNewComment({ ...newComment, comment_type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="general">General</option>
                <option value="technical">Técnico</option>
                <option value="customer">Cliente</option>
                <option value="admin">Administración</option>
                <option value="internal">Interno</option>
              </select>
            </div>

            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newComment.is_internal}
                  onChange={(e) => setNewComment({ ...newComment, is_internal: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Comentario interno (no visible para cliente)</span>
              </label>
            </div>
          </div>

          <div>
            <textarea
              value={newComment.comment_text}
              onChange={(e) => setNewComment({ ...newComment, comment_text: e.target.value })}
              placeholder="Escriba su comentario u observación..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <button
            type="submit"
            disabled={submitting || !newComment.comment_text.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            {submitting ? 'Enviando...' : 'Agregar Comentario'}
          </button>
        </form>
      )}

      <div className="space-y-3">
        {comments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No hay comentarios registrados</p>
          </div>
        ) : (
          comments.map((comment) => (
            <div
              key={comment.id}
              className={`border rounded-lg p-4 ${
                comment.is_internal
                  ? 'bg-yellow-50 border-yellow-200'
                  : 'bg-white border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getCommentTypeColor(comment.comment_type)}`}>
                    {getCommentTypeLabel(comment.comment_type)}
                  </span>
                  {comment.is_internal && (
                    <span className="px-2 py-1 bg-yellow-200 text-yellow-800 rounded text-xs font-medium">
                      Interno
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Clock className="w-3 h-3" />
                  {new Date(comment.created_at).toLocaleString('es-MX')}
                </div>
              </div>

              <p className="text-gray-700 whitespace-pre-wrap">{comment.comment_text}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
