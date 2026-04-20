alter table public.shopping_items
  drop constraint if exists shopping_items_estimated_price_check;

alter table public.shopping_items
  drop column if exists unit,
  drop column if exists note,
  drop column if exists estimated_price;
