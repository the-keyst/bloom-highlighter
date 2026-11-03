(import (scheme base) (scheme list) (scheme write))

(define (make-task id title done?)
  (list id title done?))

(define (task-id task) (list-ref task 0))
(define (task-title task) (list-ref task 1))
(define (task-done? task) (list-ref task 2))

(define (add-task tasks title)
  (let ((clean-title title))
    (if (string=? clean-title "")
        tasks
        (append tasks
          (list (make-task (+ 1 (length tasks)) clean-title #f))))))

(define (complete-task tasks id)
  (if (not (member id (map task-id tasks)))
      #f
      (map (lambda (task)
        (if (= (task-id task) id)
            (make-task id (task-title task) #t)
            task))
        tasks)))

(define (pending-tasks tasks)
  (filter (lambda (task) (not (task-done? task))) tasks))

(define (completed-count tasks)
  (length (filter task-done? tasks)))

(define (summary tasks)
  (string-append (number->string (length (pending-tasks tasks)))
    " pending, " (number->string (completed-count tasks)) " complete"))

(define (main)
  (let* ((initial (list (make-task 1 "Review changes" #f)
                        (make-task 2 "Publish package" #f)))
         (completed (complete-task initial 1)))
    (if (not completed) (error "Task was not found")
        (let ((expanded (add-task completed "Write documentation")))
          (display (summary expanded))
          (newline)
          (for-each (lambda (task)
            (display "- ") (display (task-title task)) (newline))
            (pending-tasks expanded))))))

(main)
