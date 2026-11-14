create type public.app_role as enum ('admin', 'user');
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "Users read own roles" on public.user_roles for select to authenticated using (auth.uid() = user_id);

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

-- First account ever created becomes the admin
create or replace function public.assign_first_admin()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.user_roles where role = 'admin') then
    insert into public.user_roles (user_id, role) values (new.id, 'admin');
  end if;
  return new;
end; $$;
create trigger on_auth_user_created_admin after insert on auth.users
for each row execute function public.assign_first_admin();

create table public.gallery_images (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null,
  image_url text not null,
  storage_path text,
  tall boolean not null default false,
  created_at timestamptz not null default now()
);
grant select on public.gallery_images to anon, authenticated;
grant insert, update, delete on public.gallery_images to authenticated;
grant all on public.gallery_images to service_role;
alter table public.gallery_images enable row level security;
create policy "Anyone views gallery" on public.gallery_images for select to anon, authenticated using (true);
create policy "Admins insert gallery" on public.gallery_images for insert to authenticated with check (public.has_role(auth.uid(), 'admin'));
create policy "Admins update gallery" on public.gallery_images for update to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "Admins delete gallery" on public.gallery_images for delete to authenticated using (public.has_role(auth.uid(), 'admin'));

create table public.page_views (
  id uuid primary key default gen_random_uuid(),
  path text not null,
  referrer text,
  language text,
  created_at timestamptz not null default now()
);
grant insert on public.page_views to anon, authenticated;
grant select on public.page_views to authenticated;
grant all on public.page_views to service_role;
alter table public.page_views enable row level security;
create policy "Anyone logs a view" on public.page_views for insert to anon, authenticated
  with check (char_length(path) <= 200 and (referrer is null or char_length(referrer) <= 500) and (language is null or char_length(language) <= 20));
create policy "Admins read views" on public.page_views for select to authenticated using (public.has_role(auth.uid(), 'admin'));

create table public.inquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null, email text not null, wedding_date date, location text,
  services text[] not null default '{}', message text,
  created_at timestamptz not null default now()
);
grant insert on public.inquiries to anon, authenticated;
grant select, delete on public.inquiries to authenticated;
grant all on public.inquiries to service_role;
alter table public.inquiries enable row level security;
create policy "Anyone sends inquiry" on public.inquiries for insert to anon, authenticated
  with check (char_length(name) <= 100 and char_length(email) <= 255 and (message is null or char_length(message) <= 1000));
create policy "Admins read inquiries" on public.inquiries for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "Admins delete inquiries" on public.inquiries for delete to authenticated using (public.has_role(auth.uid(), 'admin'));

create policy "Public read gallery files" on storage.objects for select using (bucket_id = 'gallery');
create policy "Admins upload gallery files" on storage.objects for insert to authenticated with check (bucket_id = 'gallery' and public.has_role(auth.uid(), 'admin'));
create policy "Admins delete gallery files" on storage.objects for delete to authenticated using (bucket_id = 'gallery' and public.has_role(auth.uid(), 'admin'));
