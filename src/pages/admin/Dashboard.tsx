// src/pages/admin/Dashboard.tsx
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Users, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type CheckinRow = {
  id: string;
  lead_id: string;
  model_name: string | null;
  responsible: string | null;
  model_photo?: string | null;
  checked_in_at: string; // ISO
};

export default function Dashboard() {
  // ----- Filtro de data -----
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date(); d.setDate(d.getDate() - 7);
    d.setHours(0,0,0,0);
    return d.toISOString().slice(0,10);
  });
  const [endDate, setEndDate] = useState<string>(() => {
    const d = new Date();
    d.setHours(23,59,59,999);
    return d.toISOString().slice(0,10);
  });

  // Dados agregados por dia
  const [daily, setDaily] = useState<{ date: string; count: number }[]>([]);
  const [loading, setLoading] = useState(false);

  // ----- Drilldown -----
  const [openList, setOpenList] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [rows, setRows] = useState<CheckinRow[]>([]);
  const [loadingRows, setLoadingRows] = useState(false);

  // ----- Colunas selecionáveis -----
  const ALL_COLUMNS = [
    { key: 'lead_id', label: 'ID do Lead' },
    { key: 'model_name', label: 'Nome do Modelo' },
    { key: 'responsible', label: 'Responsável' },
    { key: 'checked_in_at', label: 'Data/Hora do Check-in' },
  ] as const;
  const [visibleCols, setVisibleCols] = useState<string[]>(ALL_COLUMNS.map(c => c.key));

  // Carrega contagens por dia
  const loadDaily = async () => {
    setLoading(true);
    try {
      const fromISO = new Date(`${startDate}T00:00:00Z`).toISOString();
      const toISO   = new Date(`${endDate}T23:59:59Z`).toISOString();

      // Pega os check-ins no intervalo
      const { data, error } = await supabase
        .from('check_ins')
        .select('id, lead_id, model_name, responsible, checked_in_at')
        .gte('checked_in_at', fromISO)
        .lte('checked_in_at', toISO)
        .order('checked_in_at', { ascending: true });

      if (error) throw error;

      // Agrega por dia no client
      const map = new Map<string, number>();
      (data ?? []).forEach((r) => {
        const date = r.checked_in_at.slice(0,10); // YYYY-MM-DD
        map.set(date, (map.get(date) ?? 0) + 1);
      });

      const arr = Array.from(map.entries())
        .map(([date, count]) => ({ date, count }))
        .sort((a,b) => a.date.localeCompare(b.date));

      setDaily(arr);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => loadDaily();

  useEffect(() => { loadDaily(); }, []); // primeira carga

  const openDay = async (dateStr: string) => {
    setSelectedDate(dateStr);
    setOpenList(true);
    setLoadingRows(true);
    try {
      const fromISO = new Date(`${dateStr}T00:00:00Z`).toISOString();
      const toISO   = new Date(`${dateStr}T23:59:59Z`).toISOString();

      const { data, error } = await supabase
        .from('check_ins')
        .select('id, lead_id, model_name, responsible, model_photo, checked_in_at')
        .gte('checked_in_at', fromISO)
        .lte('checked_in_at', toISO)
        .order('checked_in_at', { ascending: true });

      if (error) throw error;
      setRows((data ?? []) as CheckinRow[]);
    } finally {
      setLoadingRows(false);
    }
  };

  const toggleColumn = (key: string) => {
    setVisibleCols(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const getRowValue = (row: CheckinRow, key: string): string => {
    if (key === 'checked_in_at') {
      return new Date(row.checked_in_at).toLocaleString();
    }
    const value = row[key as keyof CheckinRow];
    return value ? String(value) : '';
  };

  const exportPdf = () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'pt' });
    const title = `Check-ins - ${selectedDate ?? `${startDate} a ${endDate}`}`;
    doc.text(title, 40, 40);

    const cols = ALL_COLUMNS.filter(c => visibleCols.includes(c.key)).map(c => c.label);
    const body = rows.map(r => ALL_COLUMNS
      .filter(c => visibleCols.includes(c.key))
      .map(c => getRowValue(r, c.key))
    );

    autoTable(doc, {
      head: [cols],
      body,
      startY: 60
    });

    doc.save(`checkins_${selectedDate ?? `${startDate}_${endDate}`}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gold mb-2">Dashboard</h1>
        <p className="text-white/60">Visão geral do sistema MaxCheckin</p>
      </div>

      {/* Filtros */}
      <Card className="border-gold/20 bg-black/40 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-gold">Filtro por Data</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
          <div>
            <label className="text-white/70 text-sm block mb-1">Início</label>
            <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-background/50 border-gold/20 text-white"/>
          </div>
          <div>
            <label className="text-white/70 text-sm block mb-1">Fim</label>
            <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-background/50 border-gold/20 text-white"/>
          </div>
          <Button onClick={applyFilters} disabled={loading} className="bg-gold hover:bg-gold/90 text-black">
            {loading ? 'Carregando...' : 'Aplicar'}
          </Button>
        </CardContent>
      </Card>

      {/* Tabela diária */}
      <Card className="border-gold/20 bg-black/40 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-gold">Check-ins por Dia</CardTitle>
        </CardHeader>
        <CardContent>
          {daily.length === 0 ? (
            <div className="text-white/60 text-center py-8">Sem check-ins no período</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-white/70">
                    <th className="text-left py-2">Data</th>
                    <th className="text-left py-2">Quantidade</th>
                    <th className="text-left py-2">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {daily.map(d => (
                    <tr key={d.date} className="border-t border-gold/10">
                      <td className="py-2 text-white">{new Date(d.date).toLocaleDateString()}</td>
                      <td className="py-2 text-white">{d.count}</td>
                      <td className="py-2">
                        <Button variant="outline" className="border-gold/30 text-white" onClick={() => openDay(d.date)}>
                          Ver lista
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de lista (drilldown) */}
      <Dialog open={openList} onOpenChange={setOpenList}>
        <DialogContent className="max-w-5xl border-gold/20 bg-black/40 backdrop-blur-sm">
          <DialogHeader>
            <DialogTitle className="text-gold flex items-center justify-between">
              Check-ins de {selectedDate ? new Date(selectedDate).toLocaleDateString() : ''}
              <div className="flex items-center gap-2">
                <Button onClick={exportPdf} disabled={loadingRows || rows.length===0} className="bg-gold hover:bg-gold/90 text-black">
                  <Download className="w-4 h-4 mr-2" /> Exportar PDF
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>

          {/* Seleção de colunas */}
          <div className="flex flex-wrap gap-4 mb-4">
            {ALL_COLUMNS.map(c => (
              <label key={c.key} className="flex items-center gap-2 text-white/80">
                <Checkbox
                  checked={visibleCols.includes(c.key)}
                  onCheckedChange={() => toggleColumn(c.key)}
                />
                {c.label}
              </label>
            ))}
          </div>

          {/* Tabela de resultados */}
          <div className="overflow-x-auto">
            {loadingRows ? (
              <div className="text-white/60 text-center py-8">Carregando...</div>
            ) : rows.length === 0 ? (
              <div className="text-white/60 text-center py-8">Sem registros</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-white/70">
                    {ALL_COLUMNS.filter(c => visibleCols.includes(c.key)).map(c => (
                      <th key={c.key} className="text-left py-2">{c.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map(r => (
                    <tr key={r.id} className="border-t border-gold/10">
                      {ALL_COLUMNS.filter(c => visibleCols.includes(c.key)).map(c => {
                        const value = getRowValue(r, c.key);
                        return <td key={c.key} className="py-2 text-white">{value}</td>;
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
