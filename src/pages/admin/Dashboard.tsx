import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Monitor, Phone, Clock } from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState({
    checkinsToday: 0,
    activePanels: 0,
    pendingCalls: 0,
    avgTime: 0,
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      // Check-ins hoje
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { count: checkinsCount } = await supabase
        .from('check_ins')
        .select('*', { count: 'exact', head: true })
        .gte('checked_in_at', today.toISOString());

      // Painéis ativos
      const { count: panelsCount } = await supabase
        .from('panels')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      // Chamadas pendentes
      const { count: callsCount } = await supabase
        .from('calls')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'waiting');

      setStats({
        checkinsToday: checkinsCount || 0,
        activePanels: panelsCount || 0,
        pendingCalls: callsCount || 0,
        avgTime: 0,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const statCards = [
    {
      title: 'Check-ins Hoje',
      value: stats.checkinsToday,
      icon: Users,
      color: 'text-blue-400',
    },
    {
      title: 'Painéis Ativos',
      value: stats.activePanels,
      icon: Monitor,
      color: 'text-green-400',
    },
    {
      title: 'Chamadas Pendentes',
      value: stats.pendingCalls,
      icon: Phone,
      color: 'text-yellow-400',
    },
    {
      title: 'Tempo Médio',
      value: `${stats.avgTime}min`,
      icon: Clock,
      color: 'text-purple-400',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gold mb-2">Dashboard</h1>
        <p className="text-white/60">Visão geral do sistema MaxCheckin</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => (
          <Card key={stat.title} className="border-gold/20 bg-black/40 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-white/80">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-gold/20 bg-black/40 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-gold">Atividade Recente</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-white/60 text-center py-8">
            Nenhuma atividade recente
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
