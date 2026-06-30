-- 데이터 검증 제작 파이프라인 설계 기준서 — 확장 스키마

create table if not exists board_materials (
  board_id text primary key,
  board_family text not null,
  core_material text not null,
  sheet_width_mm integer not null,
  sheet_length_mm integer not null,
  thickness_mm numeric(5,1) not null,
  formaldehyde_grade text not null default '미지정',
  water_resistance_grade text not null default '미지정',
  bending_grade text not null default '미지정',
  surface_front_code text not null default '미지정',
  surface_back_code text not null default '미지정',
  manufacturer text not null,
  source_id text not null,
  active boolean not null default true
);

create table if not exists edge_profiles (
  edge_id text primary key,
  edge_material text not null,
  edge_process text not null,
  edge_thickness_mm numeric(4,1),
  edge_width_mm numeric(5,1),
  heat_moisture_class text not null default '미지정',
  visible_default boolean not null default true,
  manufacturer text not null,
  source_id text not null,
  active boolean not null default true
);

create table if not exists door_systems (
  door_system_id text primary key,
  family_name text not null,
  core_type text not null,
  core_thickness_mm numeric(5,1),
  face_material text not null,
  back_material text not null default '미지정',
  frame_material text not null default '미지정',
  edge_id text references edge_profiles(edge_id),
  finish_gloss text not null default '미지정',
  pattern_group text not null default '미지정',
  manufacturer text not null,
  source_id text not null,
  active boolean not null default true
);

create table if not exists module_catalog (
  module_id text primary key,
  manufacturer_family text not null,
  module_type text not null,
  width_mm integer not null,
  depth_mm integer not null,
  height_mm integer,
  body_board_id text references board_materials(board_id),
  door_system_id text references door_systems(door_system_id),
  door_count integer not null default 0,
  drawer_count integer not null default 0,
  sink_allowed boolean not null default false,
  faucet_allowed boolean not null default false,
  appliance_mount_type text not null default 'none',
  site_review_required boolean not null default false,
  source_id text not null,
  active boolean not null default true
);

create table if not exists sink_faucet_catalog (
  product_id text primary key,
  product_group text not null,
  model_code text not null,
  mount_type text not null,
  outer_width_mm integer,
  outer_depth_mm integer,
  outer_height_mm integer,
  bowl_depth_mm integer,
  overflow_flag text not null default '미지정',
  faucet_hole_count integer,
  faucet_hole_diameter_mm numeric(5,1),
  faucet_position_desc text not null default '미지정',
  drain_center_x_mm numeric(7,1),
  drain_center_y_mm numeric(7,1),
  cutout_width_mm numeric(7,1),
  cutout_depth_mm numeric(7,1),
  min_cabinet_width_mm integer,
  source_id text not null,
  active boolean not null default true
);

create table if not exists appliance_catalog (
  appliance_id text primary key,
  category text not null,
  brand text not null,
  model_code text not null,
  product_width_mm integer,
  product_height_mm integer,
  product_depth_mm integer,
  opening_width_min_mm integer,
  opening_width_max_mm integer,
  opening_height_min_mm integer,
  opening_height_max_mm integer,
  opening_depth_min_mm integer,
  toe_kick_height_min_mm integer,
  toe_kick_height_max_mm integer,
  leg_adjust_max_mm integer,
  door_open_clearance_mm integer,
  water_required boolean not null default false,
  drain_required boolean not null default false,
  power_required boolean not null default true,
  source_id text not null,
  active boolean not null default true
);

create table if not exists plant_profiles (
  plant_id text primary key,
  plant_name text not null,
  saw_kerf_mm numeric(4,2),
  trim_margin_mm numeric(4,2),
  cnc_hole_tolerance_mm numeric(4,2),
  hinge_program_code text not null default '미지정',
  drawer_slide_program text not null default '미지정',
  toe_kick_profile_code text not null default '미지정',
  default_pack_rule text not null default '미지정',
  active boolean not null default true
);

insert into board_materials values
  ('DW_MDF_18_1220x2440','MDF','fiberboard',1220,2440,18.0,'E0','미지정','35형','미지정','미지정','Dongwha','SRC-DONGWHA-ECOBOARD',true),
  ('DW_PB_18_1220x2440','PB','particleboard',1220,2440,18.0,'E0','미지정','15형','미지정','미지정','Dongwha','SRC-DONGWHA-ECOBOARD',true)
on conflict (board_id) do nothing;

insert into edge_profiles values
  ('EDGE_ABS_WHITE','ABS','EVA',null,null,'미지정',true,'플랫폼','SRC-EDGE-UNSPEC',true)
on conflict (edge_id) do nothing;

insert into sink_faucet_catalog values
  ('SINK_SSU_CDS85','sink_bowl','SSU-CDS85','undermount',850,515,204,204,'무',2,36.0,'수전보링 2개',null,null,null,null,null,'SRC-HANSSEM-SINK-APPL',true),
  ('SINK_SSU_CDS85S','sink_bowl','SSU-CDS85S','undermount',850,515,204,204,'무',1,36.0,'우측 수전보링 1개',null,null,null,null,null,'SRC-HANSSEM-SINK-APPL',true)
on conflict (product_id) do nothing;

insert into appliance_catalog values
  ('DW_LG_BUILTIN_FAMILY_150','dishwasher','LG','DU*/DUB* family',598,815,567,598,605,815,880,532,121,150,60,590,true,true,true,'SRC-LG-DW-INSTALL',true),
  ('DW_SAMSUNG_DW60J','dishwasher','Samsung','DW60J*',null,null,null,600,null,820,null,575,null,null,null,null,true,true,true,'SRC-SAMSUNG-DW-INSTALL',true)
on conflict (appliance_id) do nothing;

insert into plant_profiles values
  ('PLANT_DEFAULT','미등록 공장',null,null,null,'미지정','미지정','미지정','미지정',true),
  ('PLANT_REGISTERED','등록 공장',3.0,10.0,0.5,'DRILL-BASE-SIDE','SLIDE-450-30KG','TOE-150','골판지/비닐',true)
on conflict (plant_id) do nothing;

insert into module_catalog (module_id, manufacturer_family, module_type, width_mm, depth_mm, height_mm, body_board_id, door_count, drawer_count, sink_allowed, source_id) values
  ('MILAN-DRAWER-600','Hanssem Milan Unit','base_drawer',600,600,null,'DW_PB_18_1220x2440',0,1,false,'SRC-HANSSEM-MILAN-UNIT'),
  ('MILAN-OVEN-BASE-600','Hanssem Milan Unit','base_oven',600,600,null,'DW_PB_18_1220x2440',1,0,false,'SRC-HANSSEM-MILAN-UNIT')
on conflict (module_id) do nothing;
