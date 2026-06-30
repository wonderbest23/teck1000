-- Phase 3: 5대 마스터 + 플랫폼 설정 (ㅇ23ㅇ.docx 기준)

create table if not exists platform_settings (
  key text primary key,
  value_json jsonb not null,
  label text,
  updated_at timestamptz not null default now()
);

create table if not exists board_sheet_specs (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  material_group text not null check (material_group in ('pb', 'mdf', 'plywood', 'lpm_door', 'pet_door')),
  width_mm integer not null,
  height_mm integer not null,
  thickness_mm integer not null,
  grade text default 'E0',
  public_price_per_sheet numeric,
  contract_price_per_sheet numeric,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists door_finish_masters (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  manufacturer text,
  finish_type text not null check (finish_type in ('lpm', 'pet', 'asa', 'abs', 'veneer', 'paint')),
  pattern_code text,
  sheet_width_mm integer default 1220,
  sheet_height_mm integer default 2440,
  thickness_mm integer,
  edge_thickness_mm numeric(4, 1),
  front_match boolean default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists module_standards (
  id uuid primary key default gen_random_uuid(),
  product_family text not null check (product_family in (
    'kitchen_base', 'kitchen_wall', 'kitchen_full_set',
    'shoe_cabinet', 'built_in_wardrobe', 'custom_shelf', 'gap_cabinet'
  )),
  label text not null,
  width_presets_mm integer[] not null default '{}',
  default_width_mm integer,
  height_mm integer,
  depth_mm integer,
  min_height_mm integer,
  max_height_mm integer,
  min_depth_mm integer,
  max_depth_mm integer,
  height_step_mm integer default 50,
  depth_step_mm integer default 10,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists process_standards (
  id uuid primary key default gen_random_uuid(),
  factory_code text not null default 'default',
  kerf_mm numeric(4, 1) not null default 3.0,
  trim_width_mm numeric(6, 1) not null default 10,
  trim_length_mm numeric(6, 1) not null default 10,
  cut_sequence text[] not null default array['trim', 'rip', 'crosscut', 'recut', 'label', 'edge'],
  packing_rule text,
  install_hours_kitchen numeric(5, 1),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (factory_code)
);

-- hardware_items 확장 (호환 규격)
alter table hardware_items add column if not exists spec_json jsonb default '{}'::jsonb;
alter table hardware_items add column if not exists public_reference_price numeric;
alter table hardware_items add column if not exists contract_price numeric;
alter table materials add column if not exists sheet_width_mm integer default 1220;
alter table materials add column if not exists sheet_height_mm integer default 2440;
alter table materials add column if not exists grade text default 'E0';
alter table materials add column if not exists public_price_per_sheet numeric;
alter table materials add column if not exists contract_price_per_sheet numeric;

insert into platform_settings (key, value_json, label) values
  ('quote.margin_rate', '0.15'::jsonb, '마진율'),
  ('quote.edge_price_per_m', '180'::jsonb, '엣지 m당 단가(원)'),
  ('quote.cutting_price_per_job', '15000'::jsonb, '재단비(건)'),
  ('quote.assembly_price_per_set', '20000'::jsonb, '조립비(세트)'),
  ('quote.delivery_price', '30000'::jsonb, '운송비(건)'),
  ('board.kerf_mm', '3.0'::jsonb, '톱날 kerf(mm)'),
  ('board.trim_width_mm', '10'::jsonb, '원판 좌우 trim(mm)'),
  ('board.trim_length_mm', '10'::jsonb, '원판 상하 trim(mm)')
on conflict (key) do nothing;

alter table module_standards add constraint module_standards_product_family_key unique (product_family);

insert into board_sheet_specs (code, material_group, width_mm, height_mm, thickness_mm, grade, public_price_per_sheet) values
  ('pb_1220x2440_18', 'pb', 1220, 2440, 18, 'E0', 14600),
  ('mdf_1220x2440_18', 'mdf', 1220, 2440, 18, 'E0', 28000),
  ('ply_910x1820_12', 'plywood', 910, 1820, 12, 'E0', null),
  ('lpm_door_1220x2440_18', 'lpm_door', 1220, 2440, 18, 'E0', null),
  ('pet_door_1220x2440_15', 'pet_door', 1220, 2440, 15, 'E0', null)
on conflict (code) do nothing;

insert into module_standards (product_family, label, width_presets_mm, default_width_mm, height_mm, depth_mm, min_height_mm, max_height_mm, min_depth_mm, max_depth_mm) values
  ('kitchen_base', '주방 하부장', array[150,200,300,450,600,900,1000], 600, 900, 600, 800, 900, 550, 650),
  ('kitchen_wall', '주방 상부장', array[450,600,900,1000], 600, 768, 340, 500, 900, 300, 450),
  ('kitchen_full_set', '주방 상하부장 세트', array[150,200,300,450,600,900,1000], 600, 900, 600, 1800, 3000, 550, 650),
  ('shoe_cabinet', '현관 신발장', array[400,600,900,1200], 900, 2100, 350, 2100, 2400, 250, 450),
  ('built_in_wardrobe', '붙박이장', array[600,900,1200,1800,2400], 1800, 2100, 600, 2100, 2400, 500, 650),
  ('custom_shelf', '맞춤 선반장', array[200,400,600,900,1200], 800, null, null, 400, 2400, 150, 600),
  ('gap_cabinet', '틈새 수납장', array[200,300,400,600], 400, null, null, 400, 2400, 180, 600)
on conflict (product_family) do nothing;

insert into process_standards (factory_code, kerf_mm, trim_width_mm, trim_length_mm, packing_rule, install_hours_kitchen) values
  ('default', 3.0, 10, 10, '골판지/비닐, 상판 PE필름 0.03mm 2겹', 10)
on conflict (factory_code) do nothing;

insert into door_finish_masters (code, manufacturer, finish_type, pattern_code, thickness_mm, edge_thickness_mm, front_match) values
  ('hansol_lpm_18', '한솔', 'lpm', 'HSB124404', 18, 1.0, true),
  ('hansol_pet_15', '한솔', 'pet', 'HSB124430', 15, 0.6, true),
  ('entry_asa_1t', '한솔', 'asa', null, null, 1.0, true)
on conflict (code) do nothing;
