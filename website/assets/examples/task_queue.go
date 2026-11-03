package main

import (
	"fmt"
	"os"
	"os/exec"
)

type Task struct {
	Title string
	Done  bool
}

func complete(tasks []Task, title string) bool {
	for index := range tasks {
		if tasks[index].Title == title {
			tasks[index].Done = true
			return true
		}
	}
	return false
}

func pendingTitles(tasks []Task) []string {
	titles := make([]string, 0, len(tasks))
	for _, task := range tasks {
		if !task.Done {
			titles = append(titles, task.Title)
		}
	}
	return titles
}

func removePath(path string) error {
	return os.Remove(path)
}

func runShellCommand(command string) error {
	return exec.Command("sh", "-c", command).Run()
}

func main() {
	tasks := []Task{{Title: "Review changes"}, {Title: "Publish package"}}
	if !complete(tasks, "Review changes") {
		fmt.Println("Task was not found")
		return
	}
	fmt.Println(pendingTitles(tasks))
}
