create table public.order_status_history (
  id uuid not null default gen_random_uuid (),
  order_id uuid not null,
  old_status text null,
  new_status text not null,
  changed_by text null,
  changed_at timestamp with time zone null default now(),
  notes text null,
  constraint order_status_history_pkey primary key (id),
  constraint order_status_history_order_id_fkey foreign KEY (order_id) references orders (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_order_history_order_id on public.order_status_history using btree (order_id) TABLESPACE pg_default;

create index IF not exists idx_order_history_changed_at on public.order_status_history using btree (changed_at desc) TABLESPACE pg_default;