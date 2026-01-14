/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * A task queue that manages async task execution with concurrency control
 * and automatic timeout handling.
 */
class TaskQueue {
  #maxConcurrent;
  #timeout;
  #queue = [];
  #activeTasks = 0;
  #drainPromise = null;
  #drainResolve = null;

  /**
   * @constructor
   *
   * @param {object} options
   * @param {number} [options.maxConcurrent=1]
   *     Maximum number of tasks that can run concurrently.
   * @param {number} [options.timeout=5000]
   *     Timeout in milliseconds for each task.
   */
  constructor({ maxConcurrent = 1, timeout = 5000 } = {}) {
    this.#maxConcurrent = maxConcurrent;
    this.#timeout = timeout;
  }

  /**
   * Add a task to the queue. The task will be executed when a slot is available.
   *
   * @param {Function} taskFn
   *     An async function that represents the task to execute.
   * @returns {Promise}
   *     A promise that resolves with the task result or rejects if the task
   *     times out or fails.
   */
  queue(taskFn) {
    const { promise, resolve, reject } = Promise.withResolvers();

    this.#queue.push({
      taskFn,
      resolve,
      reject,
    });

    this.#process();

    return promise;
  }

  /**
   * Returns a promise that resolves when the queue is empty and all active
   * tasks have completed.
   *
   * @returns {Promise<void>}
   */
  async drain() {
    if (this.#queue.length === 0 && this.#activeTasks === 0) {
      return;
    }

    if (!this.#drainPromise) {
      const { promise, resolve } = Promise.withResolvers();
      this.#drainPromise = promise;
      this.#drainResolve = resolve;
    }

    return this.#drainPromise;
  }

  /**
   * Process queued tasks up to the concurrency limit.
   *
   * @private
   */
  #process() {
    while (this.#queue.length > 0 && this.#activeTasks < this.#maxConcurrent) {
      const { taskFn, resolve, reject } = this.#queue.shift();
      this.#activeTasks++;

      // Wrap task with timeout. Capture timer ID to clear it if task completes
      // before timeout, preventing memory leaks.
      let timer;
      const taskWithTimeout = Promise.race([
        taskFn(),
        new Promise(
          (_, timeoutReject) =>
            (timer = setTimeout(
              () => timeoutReject(new Error("Task timeout")),
              this.#timeout,
            )),
        ),
      ]);

      (async () => {
        try {
          result = await taskWithTimeout;
          resolve(result);
        } catch (e) {
          reject(e);
        } finally {
          this.#activeTasks--;
          this.#process();
          clearTimeout(timer);
          // Check if drained
          if (
            this.#queue.length === 0 &&
            this.#activeTasks === 0 &&
            this.#drainResolve
          ) {
            this.#drainResolve();
            this.#drainResolve = null;
            this.#drainPromise = null;
          }
        }
      })();
    }
  }
}

module.exports = TaskQueue;
