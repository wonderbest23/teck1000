-- 한국 종합인테리어 플랫폼 즉시 도입 기준서 — 마스터 확장

create table if not exists source_registry (
  source_id uuid primary key default gen_random_uuid(),
  source_level text not null check (source_level in (
    'ks_or_sps', 'manufacturer_catalog', 'manufacturer_product_page', 'distributor_listing'
  )),
  source_name text not null,
  source_url text not null,
  snapshot_date date not null default current_date,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists sink_bowl_master (
  id uuid primary key default gen_random_uuid(),
  brand text not null,
  model_code text not null unique,
  install_type text,
  overall_w_mm numeric,
  overall_d_mm numeric,
  overall_h_mm numeric,
  bowl_w_mm numeric,
  bowl_d_mm numeric,
  cutout_w_mm numeric,
  cutout_d_mm numeric,
  cutout_radius_mm numeric,
  drain_type text,
  min_base_cabinet_width_mm numeric,
  source_status text not null default '제작문의',
  source_id uuid references source_registry(source_id),
  created_at timestamptz not null default now()
);

create table if not exists faucet_master (
  id uuid primary key default gen_random_uuid(),
  brand text not null,
  model_code text not null unique,
  installation_type text,
  mount_hole_recommended_mm text,
  body_diameter_mm numeric,
  total_height_mm numeric,
  hose_length_mm numeric,
  source_status text not null default '제작문의',
  source_id uuid references source_registry(source_id),
  created_at timestamptz not null default now()
);

create table if not exists appliance_model_master (
  id uuid primary key default gen_random_uuid(),
  brand text not null,
  model_code text not null,
  appliance_type text not null,
  product_w_mm numeric,
  product_d_mm numeric,
  product_h_mm numeric,
  cutout_w_mm numeric,
  cutout_d_mm numeric,
  ventilation_clearance_top_mm numeric,
  ventilation_clearance_rear_mm numeric,
  manual_url text,
  source_status text not null default '제작문의',
  source_id uuid references source_registry(source_id),
  created_at timestamptz not null default now(),
  unique (brand, model_code)
);

create table if not exists room_measurement (
  id uuid primary key default gen_random_uuid(),
  order_draft_id text,
  wall_width_bottom_mm numeric,
  wall_width_mid_mm numeric,
  wall_width_top_mm numeric,
  depth_left_mm numeric,
  depth_mid_mm numeric,
  depth_right_mm numeric,
  ceiling_left_mm numeric,
  ceiling_mid_mm numeric,
  ceiling_right_mm numeric,
  hot_water_x_mm numeric,
  hot_water_y_mm numeric,
  cold_water_x_mm numeric,
  cold_water_y_mm numeric,
  drain_x_mm numeric,
  drain_y_mm numeric,
  drain_type text check (drain_type in ('wall', 'floor')),
  photos jsonb default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists order_preview_log (
  id uuid primary key default gen_random_uuid(),
  project_type text not null,
  design_json jsonb not null,
  verdict text not null,
  warning_count int default 0,
  error_count int default 0,
  bom_json jsonb,
  validation_log jsonb,
  created_at timestamptz not null default now()
);

insert into source_registry (source_level, source_name, source_url, notes) values
  ('ks_or_sps', 'SPS-KHFC 001-0438 붙박이식 싱크대', 'https://www.gagu2.or.kr/certification/01/01.SPS-KHFC%20001-0438_2022.pdf', '주방 치수 표준'),
  ('manufacturer_product_page', '백조씽크 제품', 'https://baekjosink.com/', '싱크볼·수전')
on conflict do nothing;

insert into sink_bowl_master (brand, model_code, install_type, overall_w_mm, overall_d_mm, overall_h_mm, bowl_w_mm, bowl_d_mm, cutout_w_mm, cutout_d_mm, cutout_radius_mm, drain_type, min_base_cabinet_width_mm, source_status)
values
  ('백조씽크', 'RECO85', 'inset', 850, 520, 230, 780, 400, 822, 487, 41, '162', null, '제작문의'),
  ('백조씽크', 'BEST870', 'inset', 870, 450, 200, 806, 390, 846, 426, null, 'Ø162', null, '제작문의'),
  ('백조씽크', 'ELON_XL_8S', 'inset', 860, 500, 190, 530, 410, 840, 480, 15, '89(SS)', null, '제작문의')
on conflict (model_code) do nothing;
