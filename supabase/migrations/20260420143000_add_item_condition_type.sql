alter table public.shopping_items
  add column if not exists condition_type text;

alter table public.shopping_items
  drop constraint if exists shopping_items_condition_type_check;

alter table public.shopping_items
  add constraint shopping_items_condition_type_check
    check (condition_type is null or condition_type in ('promotion'));
