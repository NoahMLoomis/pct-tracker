alter table error_logs rename to logs;

-- existing rows are all errors (this table only ever stored errors until now)
alter table logs add column level text not null default 'error';
alter table logs alter column level drop default;

create index if not exists logs_ts_idx on logs (ts desc);
create index if not exists logs_level_idx on logs (level);
