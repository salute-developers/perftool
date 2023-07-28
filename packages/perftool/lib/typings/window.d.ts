import type { Task } from '../client/measurement/types';
import type { RunTaskResult } from '../client/measurement/runner';
import type { RawTest } from '../client/input';
import { InterceptParams } from '../api/intercept';

declare global {
    interface Window {
        // TODO comment
        _perftool_test?: RawTest<Task<any, any, any>>;
        _perftool_finish?: <T extends Task<any, any, any>[]>(result: RunTaskResult<T[number]>) => Promise<void>;
        _perftool_intercept?: (params: InterceptParams) => Promise<void>;
        _perftool_api_ready?: () => void;
    }
}

export default Window;
