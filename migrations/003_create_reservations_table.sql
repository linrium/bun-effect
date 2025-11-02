create table if not exists reservations
(
    id         uuid primary key,
    asset_id   uuid not null,
    user_id    uuid not null,
    start_time timestamp not null,
    end_time   timestamp not null,
    created_at timestamp default now(),
    updated_at timestamp default now(),
    foreign key (asset_id) references assets (id),
    foreign key (user_id) references users (id)
);