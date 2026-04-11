-- V7__add_format_to_projects.sql
-- Adds project format column (SCRUM or KANBAN)

ALTER TABLE projects ADD COLUMN format VARCHAR(20) NOT NULL DEFAULT 'SCRUM';