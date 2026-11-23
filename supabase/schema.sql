-- JUBEL - skema Supabase. Jalankan di Supabase > SQL Editor.
-- GANTI 'EMAIL_ADMIN_KAMU@gmail.com' dengan email admin sebelum menjalankan.

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null default 'lainnya'
    check (category in ('properti','gadget','otomotif','fashion','lainnya')),
  price numeric check (price is null or price >= 0),
  price_label text,
  short_description text,
  description text,
  condition text,
  location text,
  availability text default 'Tersedia',
  seller_whatsapp text,
  images text[] not null default '{}',
  badge text,
  featured boolean not null default false,
  is_published boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists products_pub_idx on public.products (is_published, category, sort_order, created_at desc);

create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at = now(); return new; end $$;
drop trigger if exists products_touch on public.products;
create trigger products_touch before update on public.products
for each row execute function public.touch_updated_at();

-- Daftar admin
create table if not exists public.admins (email text primary key);
insert into public.admins (email) values ('EMAIL_ADMIN_KAMU@gmail.com') on conflict do nothing;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where lower(email) = lower(auth.jwt() ->> 'email'));
$$;

-- Row Level Security
alter table public.products enable row level security;
alter table public.admins enable row level security;

drop policy if exists "publik baca produk terbit" on public.products;
create policy "publik baca produk terbit" on public.products
  for select using (is_published = true or public.is_admin());

drop policy if exists "admin kelola produk" on public.products;
create policy "admin kelola produk" on public.products
  for all using (public.is_admin()) with check (public.is_admin());
-- tabel admins: tanpa policy = tidak bisa diakses lewat API (aman)

-- Storage foto produk (bucket publik, hanya admin yang boleh upload/hapus)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 3145728, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

drop policy if exists "admin upload foto" on storage.objects;
create policy "admin upload foto" on storage.objects for insert to authenticated
  with check (bucket_id = 'product-images' and public.is_admin());
drop policy if exists "admin ubah foto" on storage.objects;
create policy "admin ubah foto" on storage.objects for update to authenticated
  using (bucket_id = 'product-images' and public.is_admin());
drop policy if exists "admin hapus foto" on storage.objects;
create policy "admin hapus foto" on storage.objects for delete to authenticated
  using (bucket_id = 'product-images' and public.is_admin());
