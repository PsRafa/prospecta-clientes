-- has_website deixa de ser calculado só por "tem website" e passa a ser
-- setado pela aplicação, que distingue site próprio de link de rede social
-- (Instagram, Facebook, WhatsApp etc). Rode isso uma vez no SQL Editor.

alter table businesses drop column if exists has_website;
alter table businesses add column has_website boolean not null default false;

create index if not exists businesses_has_website_idx on businesses (has_website);
