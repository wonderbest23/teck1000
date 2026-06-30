-- SPS-KHFC 우선치수로 module_standards 동기화

update module_standards set height_mm = 850 where product_family in ('kitchen_base', 'kitchen_full_set');
update module_standards set height_mm = 800, depth_mm = 340 where product_family = 'kitchen_wall';
