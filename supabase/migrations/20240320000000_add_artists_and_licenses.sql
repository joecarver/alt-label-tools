-- Create artists table
create table artists (
    id bigint primary key generated always as identity,
    created_at timestamp with time zone not null default now(),
    artist_name character varying,
    email character varying,
    gov_name character varying,
    address character varying
);

-- Create designer table
create table designer (
    id bigint primary key generated always as identity,
    created_at timestamp with time zone not null default now(),
    name character varying,
    email character varying
);

-- Create mastering_engineer table
create table mastering_engineer (
    id bigint primary key generated always as identity,
    created_at timestamp with time zone not null default now(),
    name character varying,
    email character varying
);

-- Create release_artists junction table
create table release_artists (
    artist_id bigint references artists(id) on delete cascade,
    release_id uuid references releases(id) on delete cascade,
    created_at timestamp with time zone not null default now(),
    primary key (artist_id, release_id)
);

-- Add new columns to releases table
alter table releases
    add column mastering_engineer bigint references mastering_engineer(id),
    add column designer bigint references designer(id),
    add column license_allow_politics boolean,
    add column license_allow_alcohol boolean,
    add column license_allow_pharmaceuticals boolean,
    add column license_allow_fastfood boolean,
    add column license_allow_fastfashion boolean;

-- Enable RLS for new tables
alter table artists enable row level security;
alter table designer enable row level security;
alter table mastering_engineer enable row level security;
alter table release_artists enable row level security;

-- Create policies for authenticated users
create policy "Allow authenticated users to read artists"
    on artists for select
    to authenticated
    using (true);

create policy "Allow authenticated users to read designers"
    on designer for select
    to authenticated
    using (true);

create policy "Allow authenticated users to read mastering engineers"
    on mastering_engineer for select
    to authenticated
    using (true);

create policy "Allow authenticated users to read release artists"
    on release_artists for select
    to authenticated
    using (true);

-- Create policies for service role
create policy "Allow service role to manage artists"
    on artists for all
    to service_role
    using (true)
    with check (true);

create policy "Allow service role to manage designers"
    on designer for all
    to service_role
    using (true)
    with check (true);

create policy "Allow service role to manage mastering engineers"
    on mastering_engineer for all
    to service_role
    using (true)
    with check (true);

create policy "Allow service role to manage release artists"
    on release_artists for all
    to service_role
    using (true)
    with check (true);

-- Add indexes for better query performance
create index idx_release_artists_artist_id on release_artists(artist_id);
create index idx_release_artists_release_id on release_artists(release_id);
create index idx_artists_artist_name on artists(artist_name);
create index idx_designer_name on designer(name);
create index idx_mastering_engineer_name on mastering_engineer(name); 