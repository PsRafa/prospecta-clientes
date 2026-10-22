create extension if not exists "pgcrypto";

create table if not exists businesses (
  id uuid primary key default gen_random_uuid(),
  google_place_id text unique not null,
  name text not null,
  niche text,
  phone text,
  website text,
  address text,
  city text,
  state text,
  lat double precision,
  lng double precision,
  rating numeric,
  has_website boolean not null default false,
  instagram_url text,
  facebook_url text,
  whatsapp_url text,
  linkedin_url text,
  cnpj text,
  razao_social text,
  responsavel text,
  situacao_cadastral text,
  status text not null default 'novo' check (status in ('novo', 'contatado', 'negociando', 'fechado', 'descartado')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists businesses_niche_idx on businesses (niche);
create index if not exists businesses_city_idx on businesses (city);
create index if not exists businesses_has_website_idx on businesses (has_website);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists businesses_set_updated_at on businesses;
create trigger businesses_set_updated_at
  before update on businesses
  for each row
  execute function set_updated_at();

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
