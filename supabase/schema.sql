-- ============================================
-- RABT HQ — Complete Database Schema
-- Run in Supabase SQL Editor
-- ============================================

-- PROFILES (extends auth.users)
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  name text not null default '',
  email text unique,
  role text not null default 'support'
    check (role in ('founder','manager','specialist_manager','specialist','support','ops')),
  phone text,
  avatar_url text,
  is_active boolean default true,
  specialist_id text, -- MongoDB specialist _id if applicable
  commission_percentage numeric default 30,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table profiles enable row level security;
create policy "Profiles viewable by authenticated" on profiles for select using (auth.role()='authenticated');
create policy "Users update own profile" on profiles for update using (auth.uid()=id);
create policy "Anyone insert profile" on profiles for insert with check (true);

-- LEADS (CRM)
create table if not exists leads (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  phone text,
  email text,
  concern text,
  source text default 'Manual'
    check (source in ('WhatsApp','Instagram DM','Meta Ad','Google Ad','Website','Manual','Referral')),
  stage text default 'new'
    check (stage in ('new','contacted','consultation_booked','consultation_done','converted','lost','follow_up')),
  assigned_to uuid references profiles(id),
  created_by uuid references profiles(id),
  notes text,
  last_contact_at timestamptz,
  follow_up_at timestamptz,
  mongo_user_id text, -- MongoDB user _id if from website
  tags text[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table leads enable row level security;
create policy "Leads viewable by authenticated" on leads for select using (auth.role()='authenticated');
create policy "Authenticated can insert leads" on leads for insert with check (auth.role()='authenticated');
create policy "Authenticated can update leads" on leads for update using (auth.role()='authenticated');
create policy "Authenticated can delete leads" on leads for delete using (auth.role()='authenticated');

-- TASKS
create table if not exists tasks (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  priority text default 'Medium' check (priority in ('Urgent','High','Medium','Low')),
  status text default 'todo' check (status in ('todo','progress','review','done','blocked')),
  due_date date,
  assigned_to uuid references profiles(id),
  created_by uuid references profiles(id),
  tags text[] default '{}',
  attachments text[] default '{}',
  kanban_col text default 'todo',
  position integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table tasks enable row level security;
create policy "Tasks viewable by authenticated" on tasks for select using (auth.role()='authenticated');
create policy "Authenticated can manage tasks" on tasks for all using (auth.role()='authenticated');

-- ORDERS (HQ-created orders, separate from MongoDB website orders)
create table if not exists hq_orders (
  id uuid default gen_random_uuid() primary key,
  customer_name text not null,
  customer_phone text,
  customer_email text,
  product text,
  amount numeric default 0,
  cost numeric default 0, -- product cost
  shipping_cost numeric default 0,
  courier text,
  tracking_id text,
  status text default 'New'
    check (status in ('New','Processing','Packed','Shipped','Delivered','Returned','RTO','Cancelled')),
  payment_method text default 'Prepaid'
    check (payment_method in ('Prepaid','COD')),
  payment_status text default 'pending'
    check (payment_status in ('pending','paid','failed','refunded')),
  source text default 'Manual',
  notes text,
  created_by uuid references profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table hq_orders enable row level security;
create policy "Orders viewable by authenticated" on hq_orders for select using (auth.role()='authenticated');
create policy "Authenticated can manage orders" on hq_orders for all using (auth.role()='authenticated');

-- EXPENSES
create table if not exists expenses (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  amount numeric not null default 0,
  category text default 'Other'
    check (category in ('Ad Spend','Shipping','Raw Material','Packaging','Salary','Specialist Payout','Platform Fee','Tools','Office','Other')),
  description text,
  date date default current_date,
  receipt_url text,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);
alter table expenses enable row level security;
create policy "Expenses viewable by authenticated" on expenses for select using (auth.role()='authenticated');
create policy "Authenticated can manage expenses" on expenses for all using (auth.role()='authenticated');

-- SPECIALIST EARNINGS (from consultations + order referrals)
create table if not exists specialist_earnings (
  id uuid default gen_random_uuid() primary key,
  specialist_id uuid references profiles(id),
  type text check (type in ('consultation','order_commission','bonus')),
  amount numeric not null default 0,
  description text,
  consultation_id text, -- MongoDB consultation _id
  order_id text, -- MongoDB order _id
  status text default 'pending' check (status in ('pending','paid','cancelled')),
  paid_at timestamptz,
  created_at timestamptz default now()
);
alter table specialist_earnings enable row level security;
create policy "Specialist earnings viewable" on specialist_earnings for select using (auth.role()='authenticated');
create policy "Authenticated can manage earnings" on specialist_earnings for all using (auth.role()='authenticated');

-- NOTIFICATIONS
create table if not exists notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id),
  title text not null,
  message text not null,
  type text default 'info'
    check (type in ('info','success','warning','error','order','lead','consultation','task','earning')),
  link text,
  is_read boolean default false,
  data jsonb default '{}',
  created_at timestamptz default now()
);
alter table notifications enable row level security;
create policy "Users see own notifications" on notifications for select using (auth.uid()=user_id);
create policy "Authenticated can insert notifications" on notifications for insert with check (auth.role()='authenticated');
create policy "Users update own notifications" on notifications for update using (auth.uid()=user_id);

-- GOALS & OKR
create table if not exists goals (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  target_value numeric not null,
  current_value numeric default 0,
  unit text default '',
  category text default 'General',
  owner_id uuid references profiles(id),
  start_date date,
  end_date date,
  status text default 'active' check (status in ('active','completed','paused','failed')),
  created_by uuid references profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table goals enable row level security;
create policy "Goals viewable by authenticated" on goals for select using (auth.role()='authenticated');
create policy "Authenticated can manage goals" on goals for all using (auth.role()='authenticated');

-- CONTENT CALENDAR
create table if not exists content (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  type text check (type in ('reel','post','story','blog','email','whatsapp')),
  platform text check (platform in ('Instagram','YouTube','Facebook','WhatsApp','Email','Website')),
  status text default 'idea' check (status in ('idea','scripted','filming','editing','review','scheduled','published')),
  hook text,
  script text,
  notes text,
  scheduled_at timestamptz,
  published_at timestamptz,
  assigned_to uuid references profiles(id),
  created_by uuid references profiles(id),
  media_urls text[] default '{}',
  tags text[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table content enable row level security;
create policy "Content viewable by authenticated" on content for select using (auth.role()='authenticated');
create policy "Authenticated can manage content" on content for all using (auth.role()='authenticated');

-- CALENDAR EVENTS
create table if not exists events (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  start_at timestamptz not null,
  end_at timestamptz,
  type text default 'task' check (type in ('task','meeting','launch','deadline','reminder','consultation')),
  color text default '#D4A853',
  assigned_to uuid references profiles(id),
  created_by uuid references profiles(id),
  is_all_day boolean default false,
  created_at timestamptz default now()
);
alter table events enable row level security;
create policy "Events viewable by authenticated" on events for select using (auth.role()='authenticated');
create policy "Authenticated can manage events" on events for all using (auth.role()='authenticated');

-- KNOWLEDGE BASE
create table if not exists knowledge_docs (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  content text,
  category text check (category in ('SOP','Script','Skin Science','Brand','Ingredient','Supplier','Content','Finance','Other')),
  tags text[] default '{}',
  is_public boolean default false,
  visible_to text[] default '{}', -- role names that can see this
  created_by uuid references profiles(id),
  updated_by uuid references profiles(id),
  views integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table knowledge_docs enable row level security;
create policy "KB viewable by authenticated" on knowledge_docs for select using (auth.role()='authenticated');
create policy "Authenticated can manage KB" on knowledge_docs for all using (auth.role()='authenticated');

-- AUTOMATION RULES
create table if not exists automations (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  trigger_type text check (trigger_type in ('new_order','new_lead','lead_stage_change','consultation_booked','low_stock','payment_received','task_due','manual')),
  action_type text check (action_type in ('send_whatsapp','send_email','send_sms','create_task','update_lead','notify_user','webhook')),
  trigger_config jsonb default '{}',
  action_config jsonb default '{}',
  is_active boolean default false,
  run_count integer default 0,
  last_run_at timestamptz,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);
alter table automations enable row level security;
create policy "Automations viewable by authenticated" on automations for select using (auth.role()='authenticated');
create policy "Authenticated can manage automations" on automations for all using (auth.role()='authenticated');

-- WHATSAPP MESSAGES LOG
create table if not exists whatsapp_logs (
  id uuid default gen_random_uuid() primary key,
  to_number text not null,
  message text not null,
  status text default 'pending' check (status in ('pending','sent','delivered','failed')),
  customer_name text,
  type text,
  created_at timestamptz default now()
);
alter table whatsapp_logs enable row level security;
create policy "WA logs viewable by authenticated" on whatsapp_logs for select using (auth.role()='authenticated');
create policy "Authenticated can insert WA logs" on whatsapp_logs for insert with check (auth.role()='authenticated');

-- Enable Realtime on key tables
alter publication supabase_realtime add table notifications;
alter publication supabase_realtime add table leads;
alter publication supabase_realtime add table tasks;
alter publication supabase_realtime add table hq_orders;

-- Insert default automations
insert into automations (name, description, trigger_type, action_type, trigger_config, action_config, is_active) values
('New Lead WhatsApp Welcome', 'Send welcome message when new lead is added', 'new_lead', 'send_whatsapp', '{"stages":["new"]}', '{"template":"welcome","message":"Hi {name}! Welcome to Rabt Naturals 🌿 We are here to help you with your skincare journey. Our specialist will contact you shortly!"}', true),
('Order Confirmation', 'Send order confirmation when order is placed', 'new_order', 'send_whatsapp', '{}', '{"template":"order_confirm","message":"Hi {name}! Your order #{orderNumber} has been confirmed 🎉 We will dispatch it soon! Track your order at rabtnaturals.com"}', true),
('Order Shipped', 'Notify customer when order ships', 'new_order', 'send_whatsapp', '{"status":"Shipped"}', '{"template":"shipped","message":"Hi {name}! Your order #{orderNumber} has been shipped 📦 Tracking ID: {trackingId}. Expected delivery in 3-5 days."}', true),
('Consultation Booked', 'Notify specialist when consultation is booked', 'consultation_booked', 'notify_user', '{}', '{"target":"specialist","sound":true}', true),
('Low Stock Alert', 'Alert founder when stock is low', 'low_stock', 'notify_user', '{"threshold":10}', '{"target":"founder","priority":"high"}', true),
('Follow Up Reminder', 'Remind team to follow up with leads', 'new_lead', 'create_task', '{"delay_hours":24,"stages":["new"]}', '{"title":"Follow up with {name}","priority":"High"}', true);

-- Insert default goals for March 2026
insert into goals (title, description, target_value, current_value, unit, category, start_date, end_date) values
('Month Revenue', 'Total revenue for March 2026', 100000, 52700, '₹', 'Finance', '2026-03-01', '2026-03-31'),
('Total Orders', 'Orders placed in March 2026', 154, 48, 'orders', 'Operations', '2026-03-01', '2026-03-31'),
('Ad Leads', 'Leads from paid ads', 750, 218, 'leads', 'Marketing', '2026-03-01', '2026-03-31'),
('Consultations', 'Skin consultations completed', 300, 143, 'sessions', 'Specialist', '2026-03-01', '2026-03-31'),
('Reels Published', 'Instagram reels posted', 20, 7, 'reels', 'Content', '2026-03-01', '2026-03-31'),
('Influencer Collabs', 'Influencer collaborations', 10, 2, 'collabs', 'Marketing', '2026-03-01', '2026-03-31'),
('Customer Reviews', 'Reviews collected', 30, 4, 'reviews', 'Customer', '2026-03-01', '2026-03-31'),
('WhatsApp Flows Live', 'Active automation flows', 6, 1, 'flows', 'Automation', '2026-03-01', '2026-03-31');

-- ============================================
-- DONE! Now go to Authentication > Users
-- Create these accounts:
-- ayan@rabtnaturals.com / Rabt@2026 (founder)
-- tofik@rabtnaturals.com / Tofik@123 (manager)
-- rahima@rabtnaturals.com / Rahima@123 (specialist_manager)
-- ops@rabtnaturals.com / Ops@2026 (ops)
-- ============================================
