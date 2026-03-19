CREATE TABLE impediments (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    resolved BOOLEAN NOT NULL DEFAULT FALSE,
    sprint_id BIGINT NOT NULL REFERENCES sprints(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
