-- MVP: allow API access with publishable/anon key (no auth yet)
alter table user_profile disable row level security;
alter table jobs disable row level security;
alter table source_fetch_state disable row level security;
