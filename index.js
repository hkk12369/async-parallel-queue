const Denque = require("denque");

const TYPE_FN = 1;
const TYPE_ARGS = 2;

module.exports = class AsyncParallelQueue {
	constructor(opts) {
		opts = Object.assign({
			concurrency: Infinity,
			autoStart: true,
			queueClass: Denque,
		}, opts);

		if (!(typeof opts.concurrency === 'number' && opts.concurrency >= 1)) {
			throw new TypeError(`Expected \`concurrency\` to be a number from 1 and up, got \`${opts.concurrency}\` (${typeof opts.concurrency})`);
		}

		this.queue = new opts.queueClass(); // eslint-disable-line new-cap
		this._queueClass = opts.queueClass;
		this._pendingCount = 0;
		this._concurrency = opts.concurrency;
		this._isPaused = opts.autoStart === false;
		this._resolveEmpty = () => {};
		this._resolveIdle = () => {};
        this.fnMap = new Map();
	}

	_next() {
		this._pendingCount--;

		if (this.queue.length > 0) {
			if (!this._isPaused) {
				this._run(this.queue.shift());
			}
		}
		else {
			this._resolveEmpty();
			this._resolveEmpty = () => {};

			if (this._pendingCount === 0) {
				this._resolveIdle();
				this._resolveIdle = () => {};
			}
		}
	}

    _run(opts) {
        const [type, resolve, reject, fnOrIndex, args = []] = opts;
        const fn = type === TYPE_FN ? fnOrIndex : this.fnMap.get(fnOrIndex);
        this._pendingCount++;
        (async () => {
            try {
                const val = await fn(...args);
                if (resolve) resolve(val);
                this._next();
            }
            catch (err) {
                if (reject) reject(err);
                this._next();
            }
        })();
    }

    _process(opts) {
        if (!this._isPaused && this._pendingCount < this._concurrency) {
            this._run(opts);
        }
        else {
            this.queue.push(opts);
        }
    }

	add(fn, opts = {}) {
        if (opts.ignoreResult) {
            this._process([
                TYPE_FN, // type
                resolve,
                reject,
                fn,
                opts.args,
            ]);
        }
        else {
            return new Promise((resolve, reject) => {
                this._process([
                    TYPE_FN, // type
                    resolve,
                    reject,
                    fn,
                    opts.args,
                ]);
            });
        }
	}

    fn(fn, opts = {}) {
        const index = this.fnMap.size + 1;
        this.fnMap.set(index, fn);
        return (...args) => {
            if (opts.ignoreResult) {
                this._process([
                    TYPE_ARGS, // type
                    null,
                    null,
                    index, // fn index
                    args,
                ]);
            }
            else {
                return new Promise((resolve, reject) => {
                    this._process([
                        TYPE_ARGS, // type
                        resolve,
                        reject,
                        index, // fn index
                        args,
                    ]);
                });
            }
        };
    }

	addAll(fns, opts) {
		return Promise.all(fns.map(fn => this.add(fn, opts)));
	}

	start() {
		if (!this._isPaused) {
			return;
		}

		this._isPaused = false;
		while (this.queue.length > 0 && this._pendingCount < this._concurrency) {
			this._run(this.queue.shift());
		}
	}

	pause() {
		this._isPaused = true;
	}

	clear() {
		this.queue = new this._queueClass(); // eslint-disable-line new-cap
	}

	waitEmpty() {
		// Instantly resolve if the queue is empty
		if (this.queue.length === 0) {
			return Promise.resolve();
		}

		return new Promise((resolve) => {
			const existingResolve = this._resolveEmpty;
			this._resolveEmpty = () => {
				existingResolve();
				resolve();
			};
		});
	}

	waitIdle() {
		// Instantly resolve if none pending
		if (this._pendingCount === 0) {
			return Promise.resolve();
		}

		return new Promise((resolve) => {
			const existingResolve = this._resolveIdle;
			this._resolveIdle = () => {
				existingResolve();
				resolve();
			};
		});
	}

	get size() {
		return this.queue.length;
	}

    get length() {
        return this.queue.length;
    }

	get pending() {
		return this._pendingCount;
	}

	get isPaused() {
		return this._isPaused;
	}
}