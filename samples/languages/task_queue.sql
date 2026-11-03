BEGIN;

CREATE TEMPORARY TABLE task_queue (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    title TEXT NOT NULL CHECK (length(trim(title)) > 0),
    done BOOLEAN NOT NULL DEFAULT FALSE
);

INSERT INTO task_queue (title) VALUES ('Review changes');
INSERT INTO task_queue (title) VALUES ('Publish package');
INSERT INTO task_queue (title) VALUES ('Write documentation');

UPDATE task_queue SET done = TRUE WHERE title = 'Review changes';

SELECT id, title, done FROM task_queue ORDER BY id;

SELECT title FROM task_queue
WHERE done = FALSE
ORDER BY id;

SELECT id, title FROM task_queue WHERE done = TRUE;
SELECT min(id) AS first_task FROM task_queue;
SELECT max(id) AS last_task FROM task_queue;
SELECT count(*) AS open_tasks FROM task_queue WHERE done = FALSE;

SELECT count(*) AS total_tasks FROM task_queue;
SELECT count(*) AS pending_tasks FROM task_queue WHERE done = FALSE;
SELECT count(*) AS completed_tasks FROM task_queue WHERE done = TRUE;

UPDATE task_queue SET title = trim(title);
UPDATE task_queue SET done = FALSE WHERE title = 'Write documentation';

DELETE FROM task_queue
WHERE title = '';

SELECT CASE WHEN EXISTS (
    SELECT 1 FROM task_queue WHERE title = 'Review changes' AND done = TRUE
) THEN 'Review completed' ELSE 'Review still pending' END AS status;

SELECT title, CASE WHEN done THEN 'complete' ELSE 'pending' END AS state
FROM task_queue ORDER BY title;

COMMIT;
