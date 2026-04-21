create or replace function public.list_frequent_products_for_user(
  p_list_id uuid,
  p_limit integer default 6
)
returns table (
  product_id uuid,
  name text
)
language sql
stable
security definer
set search_path = public, auth
as $$
  with ranked_products as (
    select
      item.product_id,
      coalesce(product.name, item.name) as name,
      count(*)::bigint as purchase_count,
      max(receipt.settled_at) as last_purchased_at
    from public.receipt_items item
    join public.receipts receipt
      on receipt.id = item.receipt_id
    left join public.products product
      on product.id = item.product_id
    where receipt.created_by = auth.uid()
      and item.product_id is not null
      and not exists (
        select 1
        from public.shopping_items shopping_item
        where shopping_item.list_id = p_list_id
          and shopping_item.product_id = item.product_id
      )
    group by item.product_id, coalesce(product.name, item.name)
  )
  select ranked_products.product_id, ranked_products.name
  from ranked_products
  order by
    ranked_products.purchase_count desc,
    ranked_products.last_purchased_at desc,
    ranked_products.name asc
  limit greatest(coalesce(p_limit, 6), 1);
$$;

grant execute on function public.list_frequent_products_for_user(uuid, integer) to authenticated;
