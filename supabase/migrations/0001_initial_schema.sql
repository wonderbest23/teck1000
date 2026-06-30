create extension if not exists "pgcrypto";

create table profiles (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  name text,
  phone text,
  role text not null default 'customer' check (role in ('customer', 'admin', 'factory')),
  created_at timestamptz not null default now()
);

create table product_templates (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text,
  base_type text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table materials (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  color text not null,
  thickness_mm integer not null default 18,
  price_per_m2 numeric not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table edge_bands (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  color text not null,
  price_per_m numeric not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table hardware_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  unit text not null,
  unit_price numeric not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table quotes (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references profiles(id),
  product_template_id uuid references product_templates(id),
  input_data jsonb not null,
  calculated_price numeric not null,
  board_cost numeric not null default 0,
  edge_cost numeric not null default 0,
  processing_cost numeric not null default 0,
  hardware_cost numeric not null default 0,
  packing_cost numeric not null default 0,
  delivery_cost numeric not null default 0,
  warnings jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table orders (
  id uuid primary key default gen_random_uuid(),
  order_number text unique not null,
  customer_id uuid references profiles(id),
  quote_id uuid references quotes(id),
  customer_name text not null,
  customer_phone text,
  customer_email text,
  shipping_address text,
  status text not null default 'submitted',
  total_price numeric not null,
  requested_delivery_date date,
  requested_install_date date,
  visit_required boolean not null default true,
  admin_confirmed_delivery_date date,
  admin_confirmed_install_date date,
  memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  product_template_id uuid references product_templates(id),
  item_name text not null,
  quantity integer not null default 1,
  input_data jsonb not null,
  calculated_price numeric not null,
  warnings jsonb not null default '[]'::jsonb,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table manufacturing_jobs (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  status text not null default 'generated',
  generated_at timestamptz not null default now(),
  confirmed_at timestamptz,
  admin_memo text,
  factory_memo text,
  created_at timestamptz not null default now()
);

create table manufacturing_parts (
  id uuid primary key default gen_random_uuid(),
  manufacturing_job_id uuid not null references manufacturing_jobs(id) on delete cascade,
  part_name text not null,
  width_mm integer not null,
  height_mm integer not null,
  quantity integer not null,
  material_name text not null,
  color text not null,
  note text,
  created_at timestamptz not null default now()
);

create table edge_tasks (
  id uuid primary key default gen_random_uuid(),
  manufacturing_job_id uuid not null references manufacturing_jobs(id) on delete cascade,
  part_name text not null,
  front_edge boolean not null default false,
  back_edge boolean not null default false,
  left_edge boolean not null default false,
  right_edge boolean not null default false,
  total_edge_length_mm integer not null default 0,
  note text,
  created_at timestamptz not null default now()
);

create table hardware_tasks (
  id uuid primary key default gen_random_uuid(),
  manufacturing_job_id uuid not null references manufacturing_jobs(id) on delete cascade,
  hardware_name text not null,
  spec text,
  quantity integer not null,
  unit text not null,
  note text,
  created_at timestamptz not null default now()
);

create table packing_labels (
  id uuid primary key default gen_random_uuid(),
  manufacturing_job_id uuid not null references manufacturing_jobs(id) on delete cascade,
  box_number integer not null,
  total_boxes integer not null,
  items text not null,
  caution text,
  created_at timestamptz not null default now()
);

create table order_status_logs (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  from_status text,
  to_status text not null,
  changed_by uuid references profiles(id),
  memo text,
  created_at timestamptz not null default now()
);

insert into product_templates (slug, name, description, base_type) values
  ('custom_shelf', '맞춤 선반장', '기본 오픈형 맞춤 선반장', 'custom_shelf'),
  ('gap_cabinet', '맞춤 틈새 수납장', '좁은 공간용 틈새 수납장', 'gap_cabinet'),
  ('shoe_cabinet', '맞춤 신발장', '현관용 맞춤 신발장', 'shoe_cabinet'),
  ('kitchen_base_cabinet', '싱크대 하부장', '주방 하부장 제작 단위 상품', 'kitchen_base_cabinet'),
  ('kitchen_wall_cabinet', '싱크대 상부장', '주방 벽면 상부장 제작 단위 상품', 'kitchen_wall_cabinet'),
  ('kitchen_full_set', '싱크대 상하부장 세트', '주방 상부장과 하부장을 함께 제작하는 세트 상품', 'kitchen_full_set'),
  ('built_in_wardrobe', '붙박이장', '방 전체 높이에 맞춘 붙박이장 상품', 'built_in_wardrobe');

insert into materials (name, color, thickness_mm, price_per_m2) values
  ('화이트 PB', '화이트', 18, 25000),
  ('오크 PB', '오크', 18, 28000),
  ('그레이 PB', '그레이', 18, 28000),
  ('내추럴 MDF', '내추럴', 18, 32000),
  ('자작 합판', '자작', 18, 42000),
  ('월넛 합판', '월넛', 18, 48000),
  ('블랙 LPM', '블랙', 18, 36000),
  ('무광 화이트 PET', '무광 화이트', 18, 39000);

insert into edge_bands (name, color, price_per_m) values
  ('화이트 엣지', '화이트', 1200),
  ('오크 엣지', '오크', 1200),
  ('그레이 엣지', '그레이', 1200);

insert into hardware_items (name, unit, unit_price) values
  ('조립 피스', '개', 120),
  ('목심', '개', 80),
  ('선반다보', '개', 150),
  ('댐핑 경첩', '개', 1800),
  ('일반 경첩', '개', 900),
  ('손잡이', '개', 2500),
  ('벽고정 브라켓', '개', 1200);
