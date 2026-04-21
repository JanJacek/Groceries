with ranked_duplicates as (
  select
    item.id,
    item.list_id,
    item.product_id,
    item.quantity,
    item.condition_type,
    item.is_completed,
    item.completed_at,
    item.created_at,
    item.updated_at,
    row_number() over (
      partition by item.list_id, item.product_id
      order by item.created_at asc, item.id asc
    ) as duplicate_rank
  from public.shopping_items item
),
duplicate_keepers as (
  select
    ranked.list_id,
    ranked.product_id,
    ranked.id as keeper_id
  from ranked_duplicates ranked
  where ranked.duplicate_rank = 1
),
duplicate_groups as (
  select
    ranked.list_id,
    ranked.product_id,
    duplicate_keepers.keeper_id,
    sum(ranked.quantity) as merged_quantity,
    bool_or(ranked.is_completed) as merged_is_completed,
    max(ranked.completed_at) as merged_completed_at,
    coalesce(
      min(ranked.condition_type) filter (where ranked.condition_type is not null),
      null
    ) as merged_condition_type
  from ranked_duplicates ranked
  join duplicate_keepers
    on duplicate_keepers.list_id = ranked.list_id
   and duplicate_keepers.product_id = ranked.product_id
  group by ranked.list_id, ranked.product_id
    , duplicate_keepers.keeper_id
  having count(*) > 1
)
update public.shopping_items item
set
  quantity = duplicate_groups.merged_quantity,
  is_completed = duplicate_groups.merged_is_completed,
  completed_at = case
    when duplicate_groups.merged_is_completed then duplicate_groups.merged_completed_at
    else null
  end,
  condition_type = duplicate_groups.merged_condition_type
from duplicate_groups
where item.id = duplicate_groups.keeper_id;

delete from public.shopping_items item
using (
  select id
  from (
    select
      item.id,
      row_number() over (
        partition by item.list_id, item.product_id
        order by item.created_at asc, item.id asc
      ) as duplicate_rank
    from public.shopping_items item
  ) ranked
  where ranked.duplicate_rank > 1
) duplicates
where item.id = duplicates.id;

create unique index if not exists shopping_items_list_id_product_id_key
  on public.shopping_items (list_id, product_id);
