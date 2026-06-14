alter table user_profile add column if not exists enabled_sources text[] not null default array[
  'arbeitnow','arbeitsagentur','linkedin','stepstone','germantechjobs','wellfound','indeed','xing'
];
alter table user_profile add column if not exists search_keywords text[] not null default array['software engineer','software entwickler'];
alter table user_profile add column if not exists search_location text not null default 'Germany';
alter table user_profile add column if not exists max_results_per_source int not null default 50;
alter table user_profile add column if not exists lookback_hours int not null default 24;
alter table user_profile add column if not exists job_filter_keywords text[] not null default '{}';
alter table user_profile add column if not exists dedupe_days int not null default 7;
