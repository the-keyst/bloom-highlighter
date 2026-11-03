module Main where

import Data.List (find)

data Task = Task { title :: String, done :: Bool } deriving (Show, Eq)
type TaskQueue = [Task]

addTask :: String -> TaskQueue -> TaskQueue
addTask value tasks
  | null cleanValue = tasks
  | otherwise = tasks ++ [Task cleanValue False]
  where cleanValue = unwords (words value)

completeTask :: String -> TaskQueue -> Maybe TaskQueue
completeTask value tasks = do
  _ <- find ((== value) . title) tasks
  pure (map mark tasks)
  where mark task = if title task == value then task { done = True } else task

pendingTasks :: TaskQueue -> TaskQueue
pendingTasks = filter (not . done)

completedCount :: TaskQueue -> Int
completedCount = length . filter done

summary :: TaskQueue -> String
summary tasks = show (length (pendingTasks tasks)) ++ " pending, "
  ++ show (completedCount tasks) ++ " complete"

main :: IO ()
main = do
  let initial = [Task "Review changes" False, Task "Publish package" False]
  let completed = completeTask "Review changes" initial
  case completed of
    Nothing -> error "Task was not found"
    Just tasks -> do
      let expanded = addTask "Write documentation" tasks
      putStrLn (summary expanded)
      mapM_ (putStrLn . ("- " ++) . title) (pendingTasks expanded)
