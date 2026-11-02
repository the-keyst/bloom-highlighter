#[derive(Debug)]
struct Task {
    title: String,
    done: bool,
}

fn complete(tasks: &mut [Task], title: &str) -> Result<(), String> {
    let Some(task) = tasks.iter_mut().find(|task| task.title == title) else {
        return Err(format!("Task not found: {title}"));
    };
    task.done = true;
    Ok(())
}

fn pending_titles(tasks: &[Task]) -> Vec<&str> {
    tasks
        .iter()
        .filter(|task| !task.done)
        .map(|task| task.title.as_str())
        .collect()
}

fn main() {
    let mut tasks = vec![
        Task { title: "Review changes".into(), done: false },
        Task { title: "Publish package".into(), done: false },
    ];

    if let Err(error) = complete(&mut tasks, "Review changes") {
        eprintln!("{error}");
        return;
    }
    println!("{:?}", pending_titles(&tasks));
}
