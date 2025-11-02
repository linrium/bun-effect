create table if not exists users
(
    id         uuid primary key,
    email      text unique not null,
    created_at timestamp default now(),
    updated_at timestamp default now()
);