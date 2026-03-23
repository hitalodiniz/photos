alter table public.tb_upgrade_requests
add column if not exists scheduled_cancel_at timestamp with time zone null;

create index if not exists idx_tb_upgrade_requests_profile_scheduled_cancel_at
on public.tb_upgrade_requests (profile_id, scheduled_cancel_at desc);
