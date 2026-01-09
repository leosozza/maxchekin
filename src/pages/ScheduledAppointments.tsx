import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, Clock, Phone, User, MapPin, CheckCircle, Filter, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Motion, MotionGroup } from "@/components/ui/motion";
import { Surface } from "@/components/ui/surface";

// Fix for default marker icon
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

// Constants for Bitrix integration
const DEFAULT_PROJECT_ID = 4; // Commercial project
const BITRIX_FIELD_PROJECT = 'PARENT_ID_1120';
const BITRIX_FIELD_PROJECT_RELATED = 'UF_CRM_1741215746';
const BITRIX_FIELD_CHECKIN_TIMESTAMP = 'UF_CRM_1755007072212';
const BITRIX_SYNC_TIMEOUT = 10000; // 10 seconds

interface Appointment {
  id: string;
  client_name: string;
  phone: string | null;
  bitrix_id: string;
  model_name: string;
  scheduled_date: string;
  scheduled_time: string;
  telemarketing_name: string | null;
  source: string | null;
  scouter_name: string | null;
  latitude: number | null;
  longitude: number | null;
  project_id: number | null;
  status: string;
  checked_in_at: string | null;
  created_at: string;
  updated_at: string;
}

export default function ScheduledAppointments() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [filterTime, setFilterTime] = useState("");

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("appointments")
        .select("*")
        .eq("scheduled_date", filterDate)
        .order("scheduled_time", { ascending: true });

      if (filterTime) {
        query = query.eq("scheduled_time", filterTime);
      }

      const { data, error } = await query;

      if (error) throw error;

      setAppointments(data || []);
    } catch (error) {
      console.error("Error fetching appointments:", error);
      toast({
        title: "Erro ao carregar agendamentos",
        description: "Não foi possível carregar os agendamentos.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [filterDate, filterTime, toast]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const handleCheckIn = async (appointment: Appointment) => {
    try {
      // Update appointment status
      const { error: updateError } = await supabase
        .from("appointments")
        .update({
          status: "checked_in",
          checked_in_at: new Date().toISOString(),
        })
        .eq("id", appointment.id);

      if (updateError) throw updateError;

      // Create check-in record
      const { error: checkInError } = await supabase
        .from("check_ins")
        .insert({
          lead_id: appointment.bitrix_id,
          model_name: appointment.model_name,
          model_photo: null,
          responsible: appointment.telemarketing_name,
        });

      if (checkInError) {
        console.error("Error creating check-in:", checkInError);
      }

      // Sync project information to Bitrix (async, non-blocking)
      // This runs in the background and won't block the check-in completion
      const syncToBitrix = async () => {
        try {
          const projectId = appointment.project_id || DEFAULT_PROJECT_ID;
          console.log(`[SCHEDULED-CHECKIN] Syncing project ${projectId} to Bitrix lead ${appointment.bitrix_id}`);
          
          // Get webhook URL
          const { data: config } = await supabase
            .from('webhook_config')
            .select('bitrix_webhook_url')
            .eq('is_active', true)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (config?.bitrix_webhook_url) {
            // Update lead with project information and check-in timestamp
            // Add timeout to prevent hanging
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), BITRIX_SYNC_TIMEOUT);

            const response = await fetch(`${config.bitrix_webhook_url}/crm.lead.update.json`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                id: appointment.bitrix_id,
                fields: {
                  [BITRIX_FIELD_PROJECT]: projectId,
                  [BITRIX_FIELD_PROJECT_RELATED]: projectId,
                  [BITRIX_FIELD_CHECKIN_TIMESTAMP]: new Date().toISOString(),
                },
              }),
              signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
              console.error('[SCHEDULED-CHECKIN] Failed to sync to Bitrix:', await response.text());
            } else {
              console.log('[SCHEDULED-CHECKIN] Successfully synced project to Bitrix');
            }
          }
        } catch (bitrixError) {
          if (bitrixError instanceof Error && bitrixError.name === 'AbortError') {
            console.error(`[SCHEDULED-CHECKIN] Bitrix sync timed out after ${BITRIX_SYNC_TIMEOUT}ms`);
          } else {
            console.error('[SCHEDULED-CHECKIN] Error syncing to Bitrix:', bitrixError);
          }
          // Don't fail the check-in if Bitrix sync fails
        }
      };

      // Start async sync (non-blocking)
      syncToBitrix();

      toast({
        title: "Check-in realizado!",
        description: `Check-in de ${appointment.client_name} realizado com sucesso.`,
      });

      fetchAppointments();
    } catch (error) {
      console.error("Error during check-in:", error);
      toast({
        title: "Erro ao fazer check-in",
        description: "Não foi possível realizar o check-in.",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline">Pendente</Badge>;
      case "checked_in":
        return <Badge className="bg-green-500">Check-in Feito</Badge>;
      case "cancelled":
        return <Badge variant="destructive">Cancelado</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const formatDateTime = (date: string, time: string) => {
    try {
      const dateTime = parseISO(`${date}T${time}`);
      return format(dateTime, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch (error) {
      console.error("Error formatting date/time:", { date, time, error });
      return `${date} ${time}`;
    }
  };

  return (
    <Motion preset="fadeIn" className="min-h-screen bg-gradient-studio p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <Button
              variant="glass"
              onClick={() => navigate("/")}
              className="mb-4"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar para Check-in
            </Button>
            <h1 className="text-4xl font-bold bg-gradient-gold bg-clip-text text-transparent">
              Agendados do Dia
            </h1>
            <p className="text-muted-foreground mt-2">
              Gerencie os agendamentos e realize check-ins
            </p>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="filter-date">Data</Label>
                <Input
                  id="filter-date"
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="filter-time">Horário (opcional)</Label>
                <Input
                  id="filter-time"
                  type="time"
                  value={filterTime}
                  onChange={(e) => setFilterTime(e.target.value)}
                  placeholder="Filtrar por horário"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Appointments List */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Carregando agendamentos...</p>
          </div>
        ) : appointments.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Calendar className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">
                Nenhum agendamento encontrado para esta data.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {appointments.map((appointment) => (
              <Card key={appointment.id} className="overflow-hidden">
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Info */}
                    <div className="lg:col-span-2 space-y-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-2xl font-bold text-foreground">
                            {appointment.client_name}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            ID Bitrix: {appointment.bitrix_id}
                          </p>
                        </div>
                        {getStatusBadge(appointment.status)}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span>{appointment.phone}</span>
                        </div>

                        <div className="flex items-center gap-2 text-sm">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span>Modelo: {appointment.model_name}</span>
                        </div>

                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span>
                            {formatDateTime(
                              appointment.scheduled_date,
                              appointment.scheduled_time
                            )}
                          </span>
                        </div>

                        {appointment.telemarketing_name && (
                          <div className="flex items-center gap-2 text-sm">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span>TM: {appointment.telemarketing_name}</span>
                          </div>
                        )}

                        {appointment.source && (
                          <div className="flex items-center gap-2 text-sm">
                            <span className="font-medium">Fonte:</span>
                            <Badge variant="secondary">{appointment.source}</Badge>
                          </div>
                        )}

                        {appointment.scouter_name && (
                          <div className="flex items-center gap-2 text-sm">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span>Scouter: {appointment.scouter_name}</span>
                          </div>
                        )}

                        {appointment.project_id && (
                          <div className="flex items-center gap-2 text-sm">
                            <span className="font-medium">Projeto:</span>
                            <Badge variant="outline">
                              {appointment.project_id === 4 ? "Comercial" : `ID ${appointment.project_id}`}
                            </Badge>
                          </div>
                        )}
                      </div>

                      {appointment.status === "pending" && (
                        <Button
                          onClick={() => handleCheckIn(appointment)}
                          className="mt-4"
                        >
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Fazer Check-in
                        </Button>
                      )}

                      {appointment.checked_in_at && (
                        <p className="text-sm text-muted-foreground">
                          Check-in realizado em:{" "}
                          {format(
                            parseISO(appointment.checked_in_at),
                            "dd/MM/yyyy 'às' HH:mm",
                            { locale: ptBR }
                          )}
                        </p>
                      )}
                    </div>

                    {/* Map */}
                    <div className="lg:col-span-1">
                      {appointment.latitude && appointment.longitude ? (
                        <div className="h-64 rounded-lg overflow-hidden border">
                          <MapContainer
                            center={[appointment.latitude, appointment.longitude]}
                            zoom={15}
                            style={{ height: "100%", width: "100%" }}
                            scrollWheelZoom={false}
                          >
                            <TileLayer
                              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />
                            <Marker
                              position={[appointment.latitude, appointment.longitude]}
                            >
                              <Popup>
                                <strong>{appointment.client_name}</strong>
                                <br />
                                Local de abordagem
                              </Popup>
                            </Marker>
                          </MapContainer>
                        </div>
                      ) : (
                        <div className="h-64 rounded-lg border flex items-center justify-center bg-muted">
                          <div className="text-center">
                            <MapPin className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">
                              Localização não disponível
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Motion>
  );
}
