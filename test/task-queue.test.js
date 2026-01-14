/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

const TaskQueue = require("../src/task-queue");

describe("TaskQueue", () => {
  test("executes tasks and returns results", async () => {
    const queue = new TaskQueue({ maxConcurrent: 1 });

    const result = await queue.queue(async () => {
      return "test result";
    });

    expect(result).toBe("test result");
  });

  test("respects maxConcurrent limit", async () => {
    const queue = new TaskQueue({ maxConcurrent: 2 });

    let activeTasks = 0;
    let maxActiveTasks = 0;

    const createTask = (delay) => async () => {
      activeTasks++;
      maxActiveTasks = Math.max(maxActiveTasks, activeTasks);
      await new Promise((resolve) => setTimeout(resolve, delay));
      activeTasks--;
      return delay;
    };

    // Queue 5 tasks
    const promises = [
      queue.queue(createTask(50)),
      queue.queue(createTask(50)),
      queue.queue(createTask(50)),
      queue.queue(createTask(50)),
      queue.queue(createTask(50)),
    ];

    await Promise.all(promises);

    expect(maxActiveTasks).toBe(2);
  });

  test("handles task timeout", async () => {
    const queue = new TaskQueue({ maxConcurrent: 1, timeout: 100 });

    await expect(
      queue.queue(async () => {
        await new Promise((resolve) => setTimeout(resolve, 200));
        return "should timeout";
      }),
    ).rejects.toThrow("Task timeout");
  });

  test("drain waits for all tasks to complete", async () => {
    const queue = new TaskQueue({ maxConcurrent: 2 });

    const results = [];

    queue.queue(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
      results.push(1);
    });

    queue.queue(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
      results.push(2);
    });

    queue.queue(async () => {
      await new Promise((resolve) => setTimeout(resolve, 75));
      results.push(3);
    });

    expect(results).toEqual([]);

    await queue.drain();

    // With maxConcurrent=2:
    // - Tasks 1 and 2 start at t=0
    // - Task 1 completes at t=50ms (push 1), task 3 starts
    // - Task 2 completes at t=100ms (push 2)
    // - Task 3 completes at t=125ms (push 3)
    expect(results).toEqual([1, 2, 3]);
  });

  test("drain resolves immediately if queue is empty", async () => {
    const queue = new TaskQueue({ maxConcurrent: 1 });

    await expect(queue.drain()).resolves.toBeUndefined();
  });

  test("handles task errors without breaking the queue", async () => {
    const queue = new TaskQueue({ maxConcurrent: 1 });

    await expect(
      queue.queue(async () => {
        throw new Error("Task error");
      }),
    ).rejects.toThrow("Task error");

    // Queue should still work after an error
    const result = await queue.queue(async () => {
      return "success after error";
    });

    expect(result).toBe("success after error");
  });

  test("processes tasks in order with maxConcurrent=1", async () => {
    const queue = new TaskQueue({ maxConcurrent: 1 });

    const executionOrder = [];

    const promises = [
      queue.queue(async () => {
        executionOrder.push(1);
        await new Promise((resolve) => setTimeout(resolve, 10));
      }),
      queue.queue(async () => {
        executionOrder.push(2);
        await new Promise((resolve) => setTimeout(resolve, 10));
      }),
      queue.queue(async () => {
        executionOrder.push(3);
        await new Promise((resolve) => setTimeout(resolve, 10));
      }),
    ];

    await Promise.all(promises);

    expect(executionOrder).toEqual([1, 2, 3]);
  });
});
