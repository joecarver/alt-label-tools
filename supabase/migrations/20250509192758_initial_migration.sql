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


-- Create a table for monitoring instead of a view
create table sync_health_monitor (
    id uuid primary key default uuid_generate_v4(),
    table_name text not null,
    last_sync timestamp with time zone,
    record_count bigint,
    is_healthy boolean,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create a function to update the monitoring data
create or replace function update_sync_health()
returns void language plpgsql as $$
begin
    -- Clear existing monitoring data
    delete from sync_health_monitor;
    
    -- Insert new monitoring data
    insert into sync_health_monitor (table_name, last_sync, record_count, is_healthy)
    select 
        'clients' as table_name,
        max(updated_at) as last_sync,
        count(*) as record_count,
        max(updated_at) > now() - interval '5 minutes' as is_healthy
    from clients
    union all
    select 
        'releases' as table_name,
        max(updated_at) as last_sync,
        count(*) as record_count,
        max(updated_at) > now() - interval '5 minutes' as is_healthy
    from releases
    union all
    select 
        'tasks' as table_name,
        max(updated_at) as last_sync,
        count(*) as record_count,
        max(updated_at) > now() - interval '5 minutes' as is_healthy
    from tasks
    union all
    select 
        'task_statuses' as table_name,
        max(updated_at) as last_sync,
        count(*) as record_count,
        max(updated_at) > now() - interval '5 minutes' as is_healthy
    from task_statuses;
end;
$$;

-- Create a function to check for unhealthy syncs
create or replace function check_sync_health()
returns table (
    table_name text,
    last_sync timestamp with time zone,
    record_count bigint,
    is_healthy boolean,
    time_since_last_sync interval
) language plpgsql as $$
begin
    return query
    select 
        m.table_name,
        m.last_sync,
        m.record_count,
        m.is_healthy,
        now() - m.last_sync as time_since_last_sync
    from sync_health_monitor m
    where not m.is_healthy
    order by m.last_sync asc;
end;
$$;

-- Create a function to alert on sync failures
create or replace function alert_on_sync_failure()
returns void language plpgsql as $$
declare
    unhealthy_syncs record;
begin
    for unhealthy_syncs in 
        select * from check_sync_health()
    loop
        -- Here you would implement your alerting logic
        -- For example, sending an email or webhook
        raise notice 'Sync health check failed for %: Last sync was % ago',
            unhealthy_syncs.table_name,
            unhealthy_syncs.time_since_last_sync;
    end loop;
end;
$$;

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
    error_message text,
    execution_time_ms integer,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create index for querying recent executions
create index idx_sync_executions_function_name_created_at 
on sync_executions(function_name, created_at desc);