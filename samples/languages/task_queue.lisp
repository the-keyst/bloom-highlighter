(defstruct task
  id
  title
  (done-p nil))

(defun make-queue ()
  (vector (make-task :id 1 :title "Review changes")
          (make-task :id 2 :title "Publish package")))

(defun add-task (queue title)
  (let ((clean-title (string-trim '(#\Space #\Tab) title)))
    (when (plusp (length clean-title))
      (concatenate 'vector queue
        (vector (make-task :id (1+ (length queue)) :title clean-title))))))

(defun complete-task (queue id)
  (let ((found nil))
    (let ((updated (map 'vector
      (lambda (item)
        (if (= (task-id item) id)
            (progn (setf found t) (make-task :id id :title (task-title item) :done-p t))
            item))
      queue)))
      (if found updated nil))))

(defun pending-tasks (queue)
  (remove-if #'task-done-p (coerce queue 'list)))

(defun completed-count (queue)
  (count-if #'task-done-p (coerce queue 'list)))

(defun queue-summary (queue)
  (format nil "~d pending, ~d complete"
    (length (pending-tasks queue)) (completed-count queue)))

(defun evaluate-form (form)
  (eval form))

(defun remove-task-file (pathname)
  (delete-file pathname))

(defun main ()
  (let* ((queue (make-queue))
         (completed (complete-task queue 1)))
    (unless completed (error "Task was not found"))
    (let ((expanded (add-task completed "Write documentation")))
      (format t "~a~%" (queue-summary expanded))
      (dolist (item (pending-tasks expanded))
        (format t "- ~a~%" (task-title item))))))

(main)
