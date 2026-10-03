begin;

create extension if not exists pgcrypto with schema extensions;

create table public.member_profiles (
  id text primary key,
  auth_user_id uuid unique references auth.users(id) on delete set null,
  email text not null,
  name text not null,
  avatar_url text,
  department text not null default 'Not provided',
  batch text,
  bio text not null default '',
  skills text[] not null default '{}'::text[],
  mentor_expertise text[] not null default '{}'::text[],
  reputation_score integer not null default 0 check (reputation_score >= 0),
  stats jsonb not null default '{}'::jsonb check (jsonb_typeof(stats) = 'object'),
  status text not null default 'pending'
    check (status in ('active', 'pending', 'suspended')),
  roles text[] not null default array['Student']::text[]
    check (
      cardinality(roles) > 0
      and roles <@ array['Student', 'Mentor', 'Community Moderator', 'Admin']::text[]
    ),
  is_demo boolean not null default false,
  approved_by text,
  approved_at timestamptz,
  anonymized_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint member_profiles_demo_auth_check
    check (not is_demo or auth_user_id is null),
  constraint member_profiles_approved_by_fkey
    foreign key (approved_by) references public.member_profiles(id) on delete set null
);

create unique index member_profiles_real_email_key
  on public.member_profiles (lower(email))
  where not is_demo and anonymized_at is null;
create index member_profiles_status_idx on public.member_profiles (status);
create index member_profiles_roles_idx on public.member_profiles using gin (roles);

create table public.domain_state (
  domain text primary key
    check (domain in ('projects', 'events', 'idea-centre', 'leaderboards', 'forum')),
  state jsonb not null check (jsonb_typeof(state) = 'object'),
  version bigint not null default 1 check (version > 0),
  seed_source text,
  updated_by text references public.member_profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.audit_log (
  id uuid primary key default extensions.gen_random_uuid(),
  actor_member_id text references public.member_profiles(id) on delete set null,
  action text not null,
  target_type text not null,
  target_id text,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now()
);

create index audit_log_created_at_idx on public.audit_log (created_at desc);
create index audit_log_target_idx on public.audit_log (target_type, target_id);

create table public.realtime_events (
  id bigint generated always as identity primary key,
  topic text not null check (topic in ('forum', 'events', 'projects')),
  event_type text not null,
  record_id text,
  actor_member_id text references public.member_profiles(id) on delete set null,
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  created_at timestamptz not null default now()
);

create index realtime_events_topic_id_idx on public.realtime_events (topic, id desc);

create table public.media_assets (
  id uuid primary key default extensions.gen_random_uuid(),
  owner_member_id text not null references public.member_profiles(id) on delete restrict,
  bucket_id text not null check (bucket_id in ('public-media', 'private-attachments')),
  object_path text not null,
  category text not null
    check (category in ('avatar', 'project-cover', 'event-cover', 'idea-cover', 'forum-attachment')),
  original_name text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 26214400),
  visibility text not null check (visibility in ('public', 'authenticated')),
  upload_expires_at timestamptz not null default (now() + interval '2 hours'),
  uploaded_at timestamptz,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (bucket_id, object_path),
  constraint media_asset_bucket_visibility_check check (
    (bucket_id = 'public-media' and visibility = 'public' and size_bytes <= 5242880)
    or
    (bucket_id = 'private-attachments' and visibility = 'authenticated')
  )
);

create index media_assets_owner_idx on public.media_assets (owner_member_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger member_profiles_set_updated_at
before update on public.member_profiles
for each row execute function public.set_updated_at();

create trigger domain_state_set_updated_at
before update on public.domain_state
for each row execute function public.set_updated_at();

create or replace function public.current_member_id()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select id
  from public.member_profiles
  where auth_user_id = auth.uid()
  limit 1
$$;

create or replace function public.is_current_member_active()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.member_profiles
    where auth_user_id = auth.uid()
      and status = 'active'
      and anonymized_at is null
  )
$$;

create or replace function public.current_member_has_role(required_role text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.member_profiles
    where auth_user_id = auth.uid()
      and status = 'active'
      and required_role = any(roles)
      and anonymized_at is null
  )
$$;

create or replace function public.handle_auth_user_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  profile_name text;
begin
  profile_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
    split_part(new.email, '@', 1),
    'New member'
  );

  insert into public.member_profiles (
    id,
    auth_user_id,
    email,
    name,
    avatar_url,
    status,
    roles,
    is_demo
  )
  values (
    'mem-' || replace(new.id::text, '-', ''),
    new.id,
    new.email,
    profile_name,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'avatar_url', ''),
      nullif(new.raw_user_meta_data ->> 'picture', '')
    ),
    'pending',
    array['Student']::text[],
    false
  )
  on conflict (auth_user_id) do update
    set email = excluded.email,
        name = case
          when public.member_profiles.name = '' then excluded.name
          else public.member_profiles.name
        end,
        avatar_url = coalesce(public.member_profiles.avatar_url, excluded.avatar_url);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_auth_user_created();

create or replace function public.bootstrap_first_admin(
  auth_user uuid,
  verified_email text
)
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  profile_id text;
  user_email text;
begin
  perform pg_advisory_xact_lock(hashtext('cvs-garage-first-admin'));

  select u.email
    into user_email
  from auth.users u
  where u.id = auth_user
    and u.email_confirmed_at is not null;

  if user_email is null or lower(user_email) <> lower(trim(verified_email)) then
    raise exception 'Verified Auth user does not match the bootstrap identity.'
      using errcode = '28000';
  end if;

  select id
    into profile_id
  from public.member_profiles
  where auth_user_id = auth_user
    and not is_demo;

  if profile_id is null then
    raise exception 'No member profile exists for the bootstrap identity.'
      using errcode = 'P0002';
  end if;

  if exists (
    select 1
    from public.member_profiles
    where id = profile_id
      and status = 'active'
      and 'Admin' = any(roles)
  ) then
    return true;
  end if;

  if exists (
    select 1
    from public.member_profiles
    where not is_demo
      and status = 'active'
      and 'Admin' = any(roles)
      and auth_user_id <> auth_user
  ) then
    return false;
  end if;

  update public.member_profiles
  set status = 'active',
      roles = array['Student', 'Admin']::text[],
      approved_by = profile_id,
      approved_at = coalesce(approved_at, now())
  where id = profile_id;

  insert into public.audit_log (
    actor_member_id,
    action,
    target_type,
    target_id,
    metadata
  )
  values (
    profile_id,
    'member.bootstrap_admin',
    'member',
    profile_id,
    jsonb_build_object('email', lower(user_email))
  );

  return true;
end;
$$;

create or replace function public.admin_set_member_status(
  actor_id text,
  target_id text,
  next_status text
)
returns public.member_profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.member_profiles;
begin
  if next_status not in ('active', 'pending', 'suspended') then
    raise exception 'Unsupported member status.' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.member_profiles
    where id = actor_id
      and status = 'active'
      and not is_demo
      and 'Admin' = any(roles)
  ) then
    raise exception 'Active administrator access is required.' using errcode = '42501';
  end if;

  select *
    into target
  from public.member_profiles
  where id = target_id
  for update;

  if target.id is null then
    raise exception 'Member profile was not found.' using errcode = 'P0002';
  end if;
  if target.id = actor_id then
    raise exception 'Administrators cannot change their own status.' using errcode = '23000';
  end if;
  if target.is_demo then
    raise exception 'Imported demo profiles are read-only.' using errcode = '23000';
  end if;
  if 'Admin' = any(target.roles) then
    raise exception 'Administrator profiles are protected.' using errcode = '23000';
  end if;

  update public.member_profiles
  set status = next_status,
      approved_by = case when next_status = 'active' then actor_id else approved_by end,
      approved_at = case when next_status = 'active' then now() else approved_at end
  where id = target_id
  returning * into target;

  insert into public.audit_log (
    actor_member_id,
    action,
    target_type,
    target_id,
    metadata
  )
  values (
    actor_id,
    'member.status_changed',
    'member',
    target_id,
    jsonb_build_object('status', next_status)
  );

  return target;
end;
$$;

create or replace function public.admin_set_member_role(
  actor_id text,
  target_id text,
  role_name text,
  enabled boolean
)
returns public.member_profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.member_profiles;
  next_roles text[];
begin
  if role_name not in ('Mentor', 'Community Moderator') then
    raise exception 'Only Mentor and Community Moderator can be managed here.'
      using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.member_profiles
    where id = actor_id
      and status = 'active'
      and not is_demo
      and 'Admin' = any(roles)
  ) then
    raise exception 'Active administrator access is required.' using errcode = '42501';
  end if;

  select *
    into target
  from public.member_profiles
  where id = target_id
  for update;

  if target.id is null then
    raise exception 'Member profile was not found.' using errcode = 'P0002';
  end if;
  if target.id = actor_id then
    raise exception 'Administrators cannot change their own roles.' using errcode = '23000';
  end if;
  if target.is_demo then
    raise exception 'Imported demo profiles are read-only.' using errcode = '23000';
  end if;
  if 'Admin' = any(target.roles) then
    raise exception 'Administrator profiles are protected.' using errcode = '23000';
  end if;

  next_roles := array(
    select distinct value
    from unnest(
      array_append(
        case
          when enabled then array_append(target.roles, role_name)
          else array_remove(target.roles, role_name)
        end,
        'Student'
      )
    ) as roles(value)
    order by value
  );

  update public.member_profiles
  set roles = next_roles,
      mentor_expertise = case
        when role_name = 'Mentor' and not enabled then '{}'::text[]
        else mentor_expertise
      end
  where id = target_id
  returning * into target;

  insert into public.audit_log (
    actor_member_id,
    action,
    target_type,
    target_id,
    metadata
  )
  values (
    actor_id,
    'member.role_changed',
    'member',
    target_id,
    jsonb_build_object('role', role_name, 'enabled', enabled)
  );

  return target;
end;
$$;

create or replace function public.admin_anonymize_member(
  actor_id text,
  target_id text
)
returns public.member_profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.member_profiles;
begin
  if not exists (
    select 1
    from public.member_profiles
    where id = actor_id
      and status = 'active'
      and not is_demo
      and 'Admin' = any(roles)
  ) then
    raise exception 'Active administrator access is required.' using errcode = '42501';
  end if;

  select *
    into target
  from public.member_profiles
  where id = target_id
  for update;

  if target.id is null then
    raise exception 'Member profile was not found.' using errcode = 'P0002';
  end if;
  if target.id = actor_id or target.is_demo or 'Admin' = any(target.roles) then
    raise exception 'This member profile cannot be anonymized.' using errcode = '23000';
  end if;

  if target.auth_user_id is not null then
    delete from auth.users where id = target.auth_user_id;
  end if;

  update public.member_profiles
  set auth_user_id = null,
      email = 'deleted+' || replace(extensions.gen_random_uuid()::text, '-', '') || '@invalid.local',
      name = 'Former member',
      avatar_url = null,
      department = 'Former member',
      batch = null,
      bio = '',
      skills = '{}'::text[],
      mentor_expertise = '{}'::text[],
      status = 'suspended',
      roles = array['Student']::text[],
      anonymized_at = now()
  where id = target_id
  returning * into target;

  insert into public.audit_log (
    actor_member_id,
    action,
    target_type,
    target_id
  )
  values (actor_id, 'member.anonymized', 'member', target_id);

  return target;
end;
$$;

create or replace function public.save_domain_state(
  domain_name text,
  expected_version bigint,
  next_state jsonb,
  actor_id text default null,
  realtime_topic text default null,
  realtime_event_type text default null,
  realtime_record_id text default null,
  realtime_payload jsonb default '{}'::jsonb
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  current_version bigint;
  saved_version bigint;
begin
  if domain_name not in ('projects', 'events', 'idea-centre', 'leaderboards', 'forum') then
    raise exception 'Unsupported domain state.' using errcode = '22023';
  end if;
  if jsonb_typeof(next_state) <> 'object' then
    raise exception 'Domain state must be a JSON object.' using errcode = '22023';
  end if;
  if realtime_topic is not null and realtime_topic not in ('forum', 'events', 'projects') then
    raise exception 'Unsupported realtime topic.' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtext('cvs-garage-domain:' || domain_name));

  select version
    into current_version
  from public.domain_state
  where domain = domain_name
  for update;

  if current_version is null then
    if expected_version <> 0 then
      raise exception 'Domain state version conflict.'
        using errcode = '40001',
              detail = format('Expected %s but the state does not exist.', expected_version);
    end if;

    insert into public.domain_state (domain, state, version, seed_source, updated_by)
    values (domain_name, next_state, 1, 'application-bootstrap', actor_id)
    returning version into saved_version;
  else
    if current_version <> expected_version then
      raise exception 'Domain state version conflict.'
        using errcode = '40001',
              detail = format('Expected %s but found %s.', expected_version, current_version);
    end if;

    update public.domain_state
    set state = next_state,
        version = current_version + 1,
        updated_by = actor_id
    where domain = domain_name
    returning version into saved_version;
  end if;

  if realtime_topic is not null and realtime_event_type is not null then
    insert into public.realtime_events (
      topic,
      event_type,
      record_id,
      actor_member_id,
      payload
    )
    values (
      realtime_topic,
      realtime_event_type,
      realtime_record_id,
      actor_id,
      coalesce(realtime_payload, '{}'::jsonb)
    );
  end if;

  return saved_version;
end;
$$;

create or replace function public.prevent_audit_log_mutation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'Audit records are append-only.' using errcode = '42501';
end;
$$;

create trigger audit_log_prevent_update
before update or delete on public.audit_log
for each row execute function public.prevent_audit_log_mutation();

alter table public.member_profiles enable row level security;
alter table public.domain_state enable row level security;
alter table public.audit_log enable row level security;
alter table public.realtime_events enable row level security;
alter table public.media_assets enable row level security;

create policy member_profiles_read
on public.member_profiles
for select
to authenticated
using (
  auth_user_id = auth.uid()
  or (
    public.is_current_member_active()
    and status = 'active'
  )
  or public.current_member_has_role('Admin')
);

create policy audit_log_admin_read
on public.audit_log
for select
to authenticated
using (public.current_member_has_role('Admin'));

create policy realtime_events_active_read
on public.realtime_events
for select
to authenticated
using (public.is_current_member_active());

create policy media_assets_public_read
on public.media_assets
for select
to anon, authenticated
using (
  deleted_at is null
  and uploaded_at is not null
  and (
    visibility = 'public'
    or public.is_current_member_active()
  )
);

revoke all on table public.member_profiles from anon, authenticated;
revoke all on table public.domain_state from anon, authenticated;
revoke all on table public.audit_log from anon, authenticated;
revoke all on table public.realtime_events from anon, authenticated;
revoke all on table public.media_assets from anon, authenticated;

grant select on table public.member_profiles to authenticated;
grant select on table public.audit_log to authenticated;
grant select on table public.realtime_events to authenticated;
grant select on table public.media_assets to anon, authenticated;
grant select, insert, update on table public.member_profiles to service_role;
grant select, insert, update on table public.domain_state to service_role;
grant select, insert on table public.audit_log to service_role;
grant select, insert on table public.realtime_events to service_role;
grant select, insert, update on table public.media_assets to service_role;
grant usage, select on sequence public.realtime_events_id_seq to service_role;

revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.handle_auth_user_created() from public, anon, authenticated;
revoke all on function public.prevent_audit_log_mutation() from public, anon, authenticated;
revoke all on function public.bootstrap_first_admin(uuid, text) from public, anon, authenticated;
revoke all on function public.admin_set_member_status(text, text, text) from public, anon, authenticated;
revoke all on function public.admin_set_member_role(text, text, text, boolean) from public, anon, authenticated;
revoke all on function public.admin_anonymize_member(text, text) from public, anon, authenticated;
revoke all on function public.save_domain_state(text, bigint, jsonb, text, text, text, text, jsonb)
  from public, anon, authenticated;

grant execute on function public.bootstrap_first_admin(uuid, text) to service_role;
grant execute on function public.admin_set_member_status(text, text, text) to service_role;
grant execute on function public.admin_set_member_role(text, text, text, boolean) to service_role;
grant execute on function public.admin_anonymize_member(text, text) to service_role;
grant execute on function public.save_domain_state(text, bigint, jsonb, text, text, text, text, jsonb)
  to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'public-media',
    'public-media',
    true,
    5242880,
    array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']
  ),
  (
    'private-attachments',
    'private-attachments',
    false,
    26214400,
    array[
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.oasis.opendocument.text',
      'application/vnd.oasis.opendocument.spreadsheet',
      'application/vnd.oasis.opendocument.presentation',
      'text/plain',
      'text/csv',
      'text/markdown',
      'application/json'
    ]
  )
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy storage_public_media_read
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'public-media');

create policy storage_authenticated_attachments_read
on storage.objects
for select
to authenticated
using (
  bucket_id = 'private-attachments'
  and public.is_current_member_active()
);

alter table public.realtime_events replica identity full;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'realtime_events'
  ) then
    alter publication supabase_realtime add table public.realtime_events;
  end if;
end
$$;

commit;
