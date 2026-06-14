-- jobs: deduplicated, normalized listings that passed the 24h + scoring filter
create table if not exists jobs (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  source_job_id text not null,
  title text not null,
  company text not null,
  location text,
  remote_type text not null default 'unknown',
  salary_min numeric,
  salary_max numeric,
  currency text,
  visa_sponsorship text not null default 'unknown',
  posted_at timestamptz not null,
  apply_url text not null,
  description text,
  tags text[],
  dedupe_hash text not null unique,
  fetched_at timestamptz not null default now(),
  match_score int,
  match_breakdown jsonb,
  created_at timestamptz not null default now()
);

create index if not exists jobs_posted_at_idx on jobs (posted_at desc);
create index if not exists jobs_match_score_idx on jobs (match_score desc);

-- user_profile: single-row (MVP) profile used for scoring
create table if not exists user_profile (
  id uuid primary key default gen_random_uuid(),
  skills text[] not null default '{}',
  target_titles text[] not null default '{}',
  preferred_locations text[] not null default '{}',
  visa_required boolean not null default true,
  seniority text,
  min_salary numeric,
  resume_text text,
  match_threshold int not null default 70,
  enabled_sources text[] not null default array[
    'arbeitnow','arbeitsagentur','linkedin','stepstone','germantechjobs','wellfound','indeed','xing'
  ],
  search_keywords text[] not null default array['software engineer','software entwickler'],
  search_location text not null default 'Germany',
  max_results_per_source int not null default 50,
  lookback_hours int not null default 24,
  job_filter_keywords text[] not null default '{}',
  dedupe_days int not null default 7,
  updated_at timestamptz not null default now()
);

-- source_fetch_state: pagination/checkpoint per source
create table if not exists source_fetch_state (
  source text primary key,
  last_run_at timestamptz,
  cursor jsonb,
  last_status text,
  last_error text
);

alter table jobs disable row level security;
alter table user_profile disable row level security;
alter table source_fetch_state disable row level security;

-- seed default profile if none exists
insert into user_profile (
  skills,
  target_titles,
  preferred_locations,
  visa_required,
  seniority,
  resume_text,
  match_threshold
)
select
  array['TypeScript', 'JavaScript', 'React', 'Node.js', 'Python', 'PostgreSQL', 'AWS'],
  array['Software Engineer', 'Backend Developer', 'Full Stack Developer', 'Frontend Developer'],
  array['Berlin', 'Munich', 'Remote', 'Hamburg', 'Frankfurt'],
  true,
  'mid',
  'Experienced software engineer with expertise in full-stack web development.',
  70
where not exists (select 1 from user_profile limit 1);
