(ns task-queue
  (:require [clojure.string :as string]))

(defn make-task [id title]
  {:id id :title title :done? false})

(defn add-task [tasks title]
  (let [clean-title (string/trim title)]
    (if (empty? clean-title)
      tasks
      (conj tasks (make-task (inc (count tasks)) clean-title)))))

(defn complete-task [tasks id]
  (let [found? (some #(= (:id %) id) tasks)]
    (if found?
      (mapv #(if (= (:id %) id) (assoc % :done? true) %) tasks)
      nil)))

(defn pending-tasks [tasks]
  (filterv #(not (:done? %)) tasks))

(defn completed-count [tasks]
  (count (filter :done? tasks)))

(defn summary [tasks]
  (str (count (pending-tasks tasks)) " pending, "
       (completed-count tasks) " complete"))

(defn -main []
  (let [initial [(make-task 1 "Review changes")
                 (make-task 2 "Publish package")]
        completed (complete-task initial 1)
        expanded (add-task completed "Write documentation")]
    (when-not completed (throw (ex-info "Task was not found" {:id 1})))
    (println (summary expanded))
    (doseq [task (pending-tasks expanded)]
      (println "-" (:title task)))))

(-main)
