## async-parallel-queue
Execute a queue of async functions in parallel.

## Install
```sh
npm install async-parallel-queue
# OR
yarn add async-parallel-queue
```

## Docs

```js
const Queue = require('async-parallel-queue');

// create a queue with 10 concurrency (10 tasks will run in parallel)
const queue = new Queue({concurrency: 10});

// add any async function to the queue, it'll run automatically in parallel with given concurrency
queue.add(async () => fetch('https://www.google.com'));
queue.add(async () => fetch('https://www.facebook.com'));

// use ignore result option if you don't care about the result
queue.add(async () => doThing(), {ignoreResult: true});

// you can use await if you need the result immediately
const res1 = await queue.add(async () => { ... });

// you can also supply arguments to the function
queue.add(async (a, b) => a + b, {args: [1, 2]});

// if you want to call the same function many times, use queue.fn
const download = queue.fn(async (url) => fetch(url));
fn('https://www.google.com');
fn('https://www.facebook.com');
const res2 = await fn('https://www.twitter.com');

// you can use ignore result with queue.fn
const download = queue.fn(async () => { ... }, {ignoreResult: true});

// when you are done adding things, wait for queue to be idle (otherwise some tasks may be incomplete)
await queue.waitIdle();

// you can pause the queue
queue.pause();
// see if queue is paused
queue.isPaused ? 'paused' : 'not paused';
// start / resume the queue
queue.start();
// get number of items in the queue
queue.length;
```
