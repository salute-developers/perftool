import { Page, HTTPRequest } from 'puppeteer';
import { minimatch } from 'minimatch';
import mime from 'mime';
import { LRUCache } from 'lru-cache';
import fsPromises from 'fs/promises';
import path from 'path';

import { JSONSerializable } from '../utils/types';
import { debug, error } from '../utils/logger';
import CWD from '../utils/cwd';

type Method = string;

const fileCache = new LRUCache({
    maxSize: 100 * 1024 ** 2,
    sizeCalculation: (value: Buffer) => {
        return value.length;
    },
});

export const enum FakeResponseType {
    JSON = 'json',
    File = 'file',
    Abort = 'abort',
}

export type InterceptParams = {
    method?: Method;
    source: string;
} & (
    | { responseType: FakeResponseType.Abort; response: undefined }
    | { responseType: FakeResponseType.File; response: string }
    | { responseType?: FakeResponseType.JSON; response: JSONSerializable }
);

type FakeResponse = { mimeType: string; data: string | Buffer };

const ANY_METHOD = 'ANY';

export async function useInterceptApi(page: Page): Promise<void> {
    const requestReplacementByMethodMap: Map<Method, Map<string, FakeResponse | null>> = new Map();

    function getRequestReplacement(url: string, method: Method): FakeResponse | null | void {
        if (!requestReplacementByMethodMap.has(method)) {
            return;
        }

        if (requestReplacementByMethodMap.get(method)!.has(url)) {
            return requestReplacementByMethodMap.get(method)!.get(url);
        }

        for (const [source, response] of requestReplacementByMethodMap.get(method)!) {
            if (minimatch(url, source)) {
                return response;
            }
        }
    }

    async function setRequestReplacement({
        method = ANY_METHOD,
        response,
        responseType = FakeResponseType.File,
        source,
    }: InterceptParams) {
        if (!requestReplacementByMethodMap.has(method)) {
            requestReplacementByMethodMap.set(method, new Map());
        }

        if (responseType === FakeResponseType.Abort) {
            debug(`[Intercept] Set up ABORT ${method} ${source}`);
            requestReplacementByMethodMap.get(method)!.set(source, null);
        }

        if (responseType === FakeResponseType.JSON) {
            debug(`[Intercept] Set up JSON response ${method} ${source}`);
            requestReplacementByMethodMap.get(method)!.set(source, {
                mimeType: 'application/json',
                data: JSON.stringify(response),
            });
        }

        if (responseType === FakeResponseType.File) {
            if (typeof response !== 'string') {
                error(
                    `[Intercept] Error while setting up file response ${method} ${source}: request replacement file path is not a string`,
                );
                return;
            }

            const mimeType = mime.getType(response);

            if (!mimeType) {
                error(
                    `[Intercept] Error while setting up file response ${method} ${source}: could not get a mime type from file extension (path: ${response})`,
                );
                return;
            }

            let data: Buffer;

            if (fileCache.has(response)) {
                data = fileCache.get(response)!;
            } else {
                try {
                    data = await fsPromises.readFile(path.resolve(CWD, response));
                    fileCache.set(response, data);
                } catch (e) {
                    error('[Intercept] Error while opening file', e);
                    return;
                }
            }

            debug(`[Intercept] Set up FILE response ${method} ${source} -> ${response}`);

            requestReplacementByMethodMap.get(method)!.set(source, {
                mimeType,
                data,
            });
        }
    }

    async function handleInterceptedRequest(req: HTTPRequest) {
        if (req.isInterceptResolutionHandled()) {
            return;
        }

        const response = getRequestReplacement(req.url(), req.method()) || getRequestReplacement(req.url(), ANY_METHOD);

        if (response === null) {
            debug(`[Intercept] ${req.method()} ${req.url()} aborted`);
            await req.abort();
            return;
        }

        if (!response) {
            await req.continue();
            return;
        }

        await req.respond({
            contentType: response.mimeType,
            body: response.data,
        });

        debug(`[Intercept] ${req.method()} ${req.url()} intercepted, respond ${response.mimeType}`);
    }

    await page.exposeFunction('_perftool_intercept', setRequestReplacement);
    await page.setRequestInterception(true);

    page.on('request', handleInterceptedRequest);
}
