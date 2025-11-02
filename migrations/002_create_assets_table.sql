create table if not exists assets
(
    id         uuid primary key,
    name       text not null,
    created_at timestamp default now(),
    updated_at timestamp default now()
);