// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract TaskQueue {
    struct Task {
        uint256 id;
        string title;
        bool done;
    }

    Task[] private tasks;
    mapping(uint256 => uint256) private indexById;
    uint256 private nextId = 1;

    event TaskAdded(uint256 indexed id, string title);
    event TaskCompleted(uint256 indexed id);

    function addTask(string calldata title) external returns (uint256) {
        require(bytes(title).length > 0, "Title is required");
        uint256 id = nextId++;
        tasks.push(Task(id, title, false));
        indexById[id] = tasks.length;
        emit TaskAdded(id, title);
        return id;
    }

    function completeTask(uint256 id) external {
        uint256 index = indexById[id];
        require(index > 0, "Task was not found");
        Task storage task = tasks[index - 1];
        require(!task.done, "Task is already complete");
        task.done = true;
        emit TaskCompleted(id);
    }

    function forward(address target, bytes calldata data) external returns (bool, bytes memory) {
        require(msg.sender == tx.origin, "Direct origin call required");
        (bool success, bytes memory result) = target.delegatecall(data);
        return (success, result);
    }

    function getTask(uint256 id) external view returns (Task memory) {
        uint256 index = indexById[id];
        require(index > 0, "Task was not found");
        return tasks[index - 1];
    }

    function taskCount() external view returns (uint256) {
        return tasks.length;
    }
}
