-- Phase 3 보완: Phase 5 시드 (정밀 공장·계약 단가)

insert into process_standards (factory_code, kerf_mm, trim_width_mm, trim_length_mm, cut_sequence, packing_rule, install_hours_kitchen) values
  ('precision', 2.8, 8, 8, array['trim', 'rip', 'crosscut', 'label', 'edge'], '코너 보호 + 수축필름, 상판 별도 박스', 12)
on conflict (factory_code) do update set
  kerf_mm = excluded.kerf_mm,
  trim_width_mm = excluded.trim_width_mm,
  trim_length_mm = excluded.trim_length_mm,
  cut_sequence = excluded.cut_sequence,
  packing_rule = excluded.packing_rule,
  install_hours_kitchen = excluded.install_hours_kitchen;

update board_sheet_specs set contract_price_per_sheet = 13200 where code = 'pb_1220x2440_18';
update board_sheet_specs set contract_price_per_sheet = 25200 where code = 'mdf_1220x2440_18';

insert into platform_settings (key, value_json, label) values
  ('factory.active_code', '"default"'::jsonb, '활성 공장 코드'),
  ('pricing.active_tier', '"public"'::jsonb, '활성 단가 정책')
on conflict (key) do nothing;
