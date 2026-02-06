alter table service_orders 
add column if not exists discount_applied_digital_card boolean default false;
