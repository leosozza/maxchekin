import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Log {
  id: string;
  event_type: string;
  severity: string;
  message: string;
  created_at: string;
}

export default function Logs() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error('Error loading logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'info': return 'bg-blue-500/20 text-blue-400';
      case 'warning': return 'bg-yellow-500/20 text-yellow-400';
      case 'error': return 'bg-red-500/20 text-red-400';
      case 'critical': return 'bg-red-600/20 text-red-300';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gold mb-2">Logs do Sistema</h1>
        <p className="text-white/60">Histórico de eventos e atividades</p>
      </div>

      <Card className="border-gold/20 bg-black/40 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-gold">Atividade Recente</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-white/60 text-center py-8">Carregando...</div>
          ) : logs.length === 0 ? (
            <div className="text-white/60 text-center py-8">
              Nenhum log registrado ainda
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-black/20 border border-white/5"
                >
                  <Badge className={getSeverityColor(log.severity)}>
                    {log.severity}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white/90">{log.event_type}</p>
                    <p className="text-sm text-white/60 truncate">{log.message}</p>
                    <p className="text-xs text-white/40 mt-1">
                      {formatDistanceToNow(new Date(log.created_at), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
