create table public.orders (
  id uuid not null default gen_random_uuid (),
  external_id text not null,
  channel text not null,
  pack_id text null,
  shipping_id text null,
  status text not null default 'nuevo'::text,
  order_date timestamp with time zone not null,
  closed_date timestamp with time zone null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  total_amount numeric(12, 2) not null,
  paid_amount numeric(12, 2) null,
  currency text null default 'COP'::text,
  customer jsonb not null,
  shipping_address jsonb null,
  items jsonb not null,
  payment_info jsonb null,
  tags text[] null,
  notes text null,
  constraint orders_pkey primary key (id),
  constraint orders_channel_external_id_key unique (channel, external_id),
  constraint orders_channel_check check (
    (
      channel = any (array['mercadolibre'::text, 'wix'::text])
    )
  ),
  constraint orders_status_check check (
    (
      status = any (
        array[
          'nuevo'::text,
          'preparando'::text,
          'enviado'::text,
          'entregado'::text,
          'cancelado'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_orders_channel on public.orders using btree (channel) TABLESPACE pg_default;

create index IF not exists idx_orders_status on public.orders using btree (status) TABLESPACE pg_default;

create index IF not exists idx_orders_order_date on public.orders using btree (order_date desc) TABLESPACE pg_default;

create index IF not exists idx_orders_pack_id on public.orders using btree (pack_id) TABLESPACE pg_default
where
  (pack_id is not null);

create index IF not exists idx_orders_external_id on public.orders using btree (external_id) TABLESPACE pg_default;

create trigger update_orders_updated_at BEFORE
update on orders for EACH row
execute FUNCTION update_updated_at_column ();