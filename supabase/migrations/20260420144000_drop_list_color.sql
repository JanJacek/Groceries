alter table public.shopping_lists
  drop constraint if exists shopping_lists_color_token_check;

alter table public.shopping_lists
  drop column if exists color_token;
