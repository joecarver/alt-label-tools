-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- Clients table
create table clients (
    id uuid primary key default uuid_generate_v4(),
    notion_id text not null unique,
    name text not null unique,
    folder_id text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Releases table
create table releases (
    id uuid primary key default uuid_generate_v4(),
    notion_id text not null unique,
    name text not null,
    catalog_number text not null,
    artist text not null,
    client_id uuid references clients(id) on delete cascade,
    notion_url text,
    folder_id text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(client_id, catalog_number)
);

-- Tasks table
create table tasks (
    id uuid primary key default uuid_generate_v4(),
    notion_id text not null unique,
    name text not null,
    release_id uuid references releases(id) on delete cascade,
    start_date timestamp with time zone,
    end_date timestamp with time zone,
    completed_at timestamp with time zone,
    is_detectable boolean default false,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Task statuses table
create table task_statuses (
    id uuid primary key default uuid_generate_v4(),
    task_id uuid unique references tasks(id) on delete cascade,
    completion_status text not null,
    due_date_status text not null,
    color text not null,
    file_info jsonb,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create updated_at triggers
create or replace function update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = timezone('utc'::text, now());
    return new;
end;
$$ language plpgsql;

create trigger update_clients_updated_at
    before update on clients
    for each row
    execute function update_updated_at_column();

create trigger update_releases_updated_at
    before update on releases
    for each row
    execute function update_updated_at_column();

create trigger update_tasks_updated_at
    before update on tasks
    for each row
    execute function update_updated_at_column();

create trigger update_task_statuses_updated_at
    before update on task_statuses
    for each row
    execute function update_updated_at_column();

-- Add indexes for better query performance
create index idx_releases_client_id on releases(client_id);
create index idx_tasks_release_id on tasks(release_id);
create index idx_task_statuses_task_id on task_statuses(task_id);
create index idx_clients_name on clients(name);
create index idx_releases_catalog_number on releases(catalog_number);

-- Enable Row Level Security
alter table clients enable row level security;
alter table releases enable row level security;
alter table tasks enable row level security;
alter table task_statuses enable row level security;


-- Create policies for authenticated users
create policy "Allow authenticated users to read clients"
  on clients for select
  to authenticated
  using (true);

create policy "Allow authenticated users to read releases"
  on releases for select
  to authenticated
  using (true);

create policy "Allow authenticated users to read tasks"
  on tasks for select
  to authenticated
  using (true);

create policy "Allow authenticated users to read task statuses"
  on task_statuses for select
  to authenticated
  using (true);

-- Create policies for service role (edge functions)
create policy "Allow service role to manage clients"
  on clients for all
  to service_role
  using (true)
  with check (true);

create policy "Allow service role to manage releases"
  on releases for all
  to service_role
  using (true)
  with check (true);

create policy "Allow service role to manage tasks"
  on tasks for all
  to service_role
  using (true)
  with check (true);

create policy "Allow service role to manage task statuses"
  on task_statuses for all
  to service_role
  using (true)
  with check (true);

-- Create sync_executions table
create table sync_executions (
    id uuid primary key default uuid_generate_v4(),
    function_name text not null,
    status text not null check (status in ('success', 'failure')),
    started_at timestamp with time zone default timezone('utc'::text, now()) not null,
    completed_at timestamp with time zone,
    records_processed integer,
    records_created integer,
    records_updated integer,
    records_deleted integer,
    error_message text,
    execution_time_ms integer,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create index for querying recent executions
create index idx_sync_executions_function_name_created_at 
on sync_executions(function_name, created_at desc);


-- Enable RLS for sync_executions table
alter table sync_executions enable row level security;

-- Create policies for authenticated users to read sync executions
create policy "Allow authenticated users to read sync executions"
  on sync_executions for select
  to authenticated
  using (true);

-- Create policies for service role to manage sync executions
create policy "Allow service role to manage sync executions"
  on sync_executions for all
  to service_role
  using (true)
  with check (true);