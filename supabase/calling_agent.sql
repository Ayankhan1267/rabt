-- ── Rabt AI Calling Agent ─────────────────────────────────────────────────

create table if not exists rabt_call_logs (
  id                uuid primary key default gen_random_uuid(),
  call_type         text not null check (call_type in ('specialist_alert','order_confirmation','appointment_reminder','appointment_confirmation')),
  to_name           text not null,
  to_phone          text not null,
  to_role           text default 'customer' check (to_role in ('customer','specialist')),
  status            text default 'queued' check (status in ('queued','ringing','in_progress','completed','failed','no_answer')),
  vapi_call_id      text,
  duration_seconds  integer,
  transcript        text,
  summary           text,
  recording_url     text,
  context           jsonb default '{}',
  created_at        timestamptz default now(),
  ended_at          timestamptz,
  updated_at        timestamptz default now()
);

-- Auto-trigger settings table
create table if not exists rabt_calling_settings (
  id                      uuid primary key default gen_random_uuid(),
  auto_specialist_alert   boolean default true,
  auto_order_confirm      boolean default true,
  auto_reminder_hours     integer default 24,
  auto_confirm_hours      integer default 2,
  voice                   text default 'Neerja',
  language                text default 'hinglish',
  working_hours_start     time default '09:00',
  working_hours_end       time default '20:00',
  max_retries             integer default 2,
  updated_at              timestamptz default now()
);

-- Insert default settings row
insert into rabt_calling_settings (id) values (gen_random_uuid())
on conflict do nothing;

-- RLS
alter table rabt_call_logs enable row level security;
alter table rabt_calling_settings enable row level security;

create policy "service_role_all_call_logs"
  on rabt_call_logs for all using (true);

create policy "service_role_all_calling_settings"
  on rabt_calling_settings for all using (true);

-- Indexes
create index if not exists idx_call_logs_status on rabt_call_logs(status);
create index if not exists idx_call_logs_created on rabt_call_logs(created_at desc);
create index if not exists idx_call_logs_vapi_id on rabt_call_logs(vapi_call_id);
