import type { Task } from '../client/measurement/types';
import type { RunTaskResult } from '../client/measurement/runner';
import type { RawTest } from '../client/input';

declare global {
    interface Window {
        // TODO comment
        tests?: Array<RawTest<Task<any, any, any>>> | { push: (...args: RawTest<Task<any, any, any>>[]) => void };
        finish: <T extends Task<any, any, any>[]>(results: RunTaskResult<T[number]>[]) => Promise<void>;
    }
}

export default Window;
