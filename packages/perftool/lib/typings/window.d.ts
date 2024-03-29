import { ErrorObject } from 'serialize-error';

import type { Task } from '../client/measurement/types';
import type { RunTaskResult } from '../client/measurement/runner';
import type { RawTest } from '../client/input';
import { InterceptParams } from '../api/intercept';
import { SetViewportParams } from '../api/viewport';

declare global {
    interface Window {
        /** Property used to insert the test into client app **/
        _perftool_test?: RawTest<Task<any, any, any>>;
        /** Function for sending test result back to server **/
        _perftool_finish?: <T extends Task<any, any, any>[]>(result: RunTaskResult<T[number]>) => Promise<void>;
        /** Intercept API **/
        _perftool_intercept?: (params: InterceptParams) => Promise<void>;
        _perftool_reset_interception?: () => Promise<void>;
        /** Viewport API **/
        _perftool_set_viewport?: (viewport: SetViewportParams) => Promise<void>;
        _perftool_preview_loaded?: true;
        /**
         * Function created when client is ready and waiting for test input,
         * called by insertion script after filling _perftool_test property.
         **/
        _perftool_api_ready?: () => void;
        /** Function for sending client errors **/
        _perftool_on_error?: (error: ErrorObject) => void;
    }
}

export default Window;
