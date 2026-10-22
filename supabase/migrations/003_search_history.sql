create table if not exists search_history (
  id uuid primary key default gen_random_uuid(),
  niche text not null,
  city text,
  state text,
  is_national boolean not null default false,
  result_count int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists search_history_created_at_idx on search_history (created_at desc);
