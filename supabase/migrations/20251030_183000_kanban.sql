-- Tabelas principais
create table public.kanban_stages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  position int not null default 0,
  panel_id uuid null,                       -- vínculo opcional com um painel
  is_default boolean not null default false, -- primeira coluna (Check-in realizado)
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.kanban_cards (
  id uuid primary key default gen_random_uuid(),
  lead_id text not null,                    -- ID do lead no Bitrix
  model_name text,
  responsible text,
  stage_id uuid not null references public.kanban_stages(id) on delete cascade,
  position int not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- histórico (auditoria)
create table public.kanban_events (
  id uuid primary key default gen_random_uuid(),
  lead_id text not null,
  from_stage_id uuid null references public.kanban_stages(id) on delete set null,
  to_stage_id uuid null references public.kanban_stages(id) on delete set null,
  method text not null check (method in ('kanban','checkin')), -- arrastar ou check-in de etapa
  by_user uuid null,                                          -- auth.uid() do operador
  created_at timestamptz default now()
);

-- quais usuários podem operar cada etapa (para o modo "check-in por usuário de etapa")
create table public.kanban_stage_users (
  stage_id uuid references public.kanban_stages(id) on delete cascade,
  user_id uuid not null, -- auth.users.id
  primary key (stage_id, user_id)
);

-- Seeds básicos
insert into public.kanban_stages (name, position, is_default)
values
('Check-in realizado', 0, true),
('Atendimento Produtor', 1, false),
('Produção de Moda', 2, false),
('Maquiagem', 3, false),
('Fotografia', 4, false),
('Entrega de Material', 5, false);

-- Habilitar realtime
alter publication supabase_realtime add table public.kanban_stages;
alter publication supabase_realtime add table public.kanban_cards;
alter publication supabase_realtime add table public.kanban_events;
alter publication supabase_realtime add table public.kanban_stage_users;

-- RLS
alter table public.kanban_stages enable row level security;
alter table public.kanban_cards enable row level security;
alter table public.kanban_events enable row level security;
alter table public.kanban_stage_users enable row level security;

-- Políticas mínimas (mesma linha de segurança do seu projeto: autenticado para ler;
-- admin para criar/alterar configurações; operadores podem mover cards)
create policy "auth can read stages" on public.kanban_stages
for select to authenticated using (auth.uid() is not null);

create policy "admins manage stages" on public.kanban_stages
for all to authenticated
using (public.has_role(auth.uid(),'admin'))
with check (public.has_role(auth.uid(),'admin'));

create policy "auth can read cards" on public.kanban_cards
for select to authenticated using (auth.uid() is not null);

-- mover/atualizar cards: admin OU operador (reutilize sua função has_role para 'operator')
create policy "operators update cards" on public.kanban_cards
for update to authenticated
using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'operator'))
with check (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'operator'));

create policy "operators insert cards" on public.kanban_cards
for insert to authenticated
with check (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'operator'));

create policy "operators delete cards" on public.kanban_cards
for delete to authenticated
using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'operator'));

create policy "auth can read events" on public.kanban_events
for select to authenticated using (auth.uid() is not null);

create policy "operators insert events" on public.kanban_events
for insert to authenticated
with check (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'operator'));

create policy "auth read stage_users" on public.kanban_stage_users
for select to authenticated using (auth.uid() is not null);

create policy "admins manage stage_users" on public.kanban_stage_users
for all to authenticated
using (public.has_role(auth.uid(),'admin'))
with check (public.has_role(auth.uid(),'admin'));

-- Trigger para auto-criar card na etapa default ao check-in
create or replace function public.trg_kanban_add_card_on_checkin()
returns trigger as $$
declare
  default_stage_id uuid;
  existing_card_count int;
begin
  -- encontra a etapa default
  select id into default_stage_id from public.kanban_stages where is_default = true limit 1;
  if default_stage_id is null then
    raise exception 'Nenhuma etapa default encontrada para kanban';
  end if;

  -- verifica se já existe card para este lead
  select count(*) into existing_card_count from public.kanban_cards where lead_id = new.lead_id;
  if existing_card_count = 0 then
    -- cria o card na etapa default
    insert into public.kanban_cards (lead_id, model_name, responsible, stage_id, position)
    values (new.lead_id, new.model_name, new.responsible, default_stage_id, 0);
  end if;

  return new;
end;
$$ language plpgsql security definer;

create trigger trg_kanban_add_card_on_checkin
after insert on public.check_ins
for each row execute function public.trg_kanban_add_card_on_checkin();