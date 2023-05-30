import simpleGit from 'simple-git';
import fsPromises from 'fs/promises';
import path from 'path';

import { Config } from '../config';
import { JSONSerializable } from '../utils/types';
import checkPath from '../utils/checkPath';
import getCurrentVersion from '../utils/version';
import { debug, info, warn } from '../utils/logger';

type TaskState = { [subjectId: string]: { [taskId: string]: JSONSerializable } };

type CacheFileContent = {
    timestamp: number;
    version: string;
    taskState: TaskState;
};

class Cache {
    private taskState: TaskState = {};

    private readonly config: Config;

    private constructor(config: Config) {
        this.config = config;
    }

    static async acquire(config: Config): Promise<Cache> {
        const instance = new Cache(config);
        await instance.purge();
        await instance.load();

        return instance;
    }

    protected withTaskStateCache(): boolean {
        return Boolean(this.config.cache.taskState);
    }

    protected withAnyCache(): boolean {
        const caches = [this.withTaskStateCache()];

        return caches.some((v) => v);
    }

    protected async purge(): Promise<void> {
        if (!this.withAnyCache()) {
            debug('No cache is configured, purge skipped');
            return;
        }

        const { cacheExpirationTime, cacheDirectory } = this.config;

        if (!cacheExpirationTime) {
            debug('No cache is purged since no expiration time is specified');
            return;
        }

        if (!(await checkPath(cacheDirectory))) {
            debug('Cache directory not found');
            return;
        }

        const cacheFileNames = await fsPromises.readdir(cacheDirectory);

        const purgeReqs = cacheFileNames.map(async (fileName) => {
            const cachePath = path.resolve(cacheDirectory, fileName);
            let cacheTimestamp = 0;

            try {
                const { timestamp } = JSON.parse(
                    await fsPromises.readFile(cachePath, { encoding: 'utf-8' }),
                ) as CacheFileContent;
                cacheTimestamp = timestamp;
            } catch (error) {
                // Handled in next condition, file to be deleted
            }

            // We don't expect falsy or NaN timestamps
            if (!cacheTimestamp || Number.isNaN(cacheTimestamp)) {
                debug(`Cache file ${fileName} is invalid and will be removed`);
            }

            if (!Number.isNaN(cacheTimestamp)) {
                if (Date.now() - Number(cacheTimestamp) <= cacheExpirationTime) {
                    return false;
                }

                debug(`Cache file ${fileName} expired and will be removed`);
            }

            try {
                await fsPromises.rm(cachePath, { recursive: true, force: true });
            } catch (error) {
                warn(`Could not purge file ${cachePath} in cache dir. Error: ${error}`);
                return;
            }

            return true;
        });

        const filesPurged = (await Promise.all(purgeReqs)).filter((r) => r).length;

        if (filesPurged > 0) {
            info(`Purged ${filesPurged} cache file(s)`);
        }
    }

    protected async getCurrentCachePath(): Promise<string | void> {
        const { currentBranchRef, cacheDirectory } = this.config;

        try {
            const key = currentBranchRef || (await simpleGit().revparse(['--short', 'HEAD']));

            return path.resolve(cacheDirectory, `${key}.json`);
        } catch (error) {
            warn('Could not obtain HEAD commit sha. Error: ', error);
        }
    }

    protected getBaseCachePath(): string | void {
        const { baseBranchRef, cacheDirectory } = this.config;

        if (!baseBranchRef) {
            return;
        }

        return path.resolve(cacheDirectory, `${baseBranchRef}.json`);
    }

    protected async setContents(contents: string): Promise<void> {
        const { version, taskState } = JSON.parse(contents) as CacheFileContent;

        if (version !== (await getCurrentVersion())) {
            return;
        }

        this.taskState = taskState;
    }

    protected async load(): Promise<void> {
        if (!this.withAnyCache()) {
            debug('No cache is configured, loading skipped');
            return;
        }

        const currentCachePath = await this.getCurrentCachePath();
        const baseCachePath = this.getBaseCachePath();

        if (currentCachePath && (await checkPath(currentCachePath))) {
            if (await checkPath(currentCachePath)) {
                await this.setContents(await fsPromises.readFile(currentCachePath, { encoding: 'utf-8' }));
                info(`Using current branch cache file: ${currentCachePath}`);

                return;
            }
        }

        if (baseCachePath && (await checkPath(baseCachePath))) {
            await this.setContents(await fsPromises.readFile(baseCachePath, { encoding: 'utf-8' }));
            info(`Using base branch cache file: ${baseCachePath}`);

            return;
        }

        info('No cache file found');
    }

    async save(): Promise<void> {
        if (!this.withAnyCache()) {
            debug('No cache is configured, saving skipped');
            return;
        }

        const { cacheDirectory } = this.config;
        const cacheFilePath = await this.getCurrentCachePath();

        if (!cacheFilePath) {
            warn('Could not define cache key, saving skipped');
            return;
        }

        const contents: CacheFileContent = {
            timestamp: Date.now(),
            version: await getCurrentVersion(),
            taskState: this.taskState,
        };

        if (!(await checkPath(cacheDirectory))) {
            debug('No cache directory exists, creating');
            await fsPromises.mkdir(cacheDirectory, { recursive: true });
        }

        await fsPromises.writeFile(cacheFilePath, JSON.stringify(contents), { encoding: 'utf-8' });
        info(`Cache data is saved to ${cacheFilePath}`);
    }

    getTaskState(subjectId: string, taskId: string): JSONSerializable | undefined {
        if (!this.withTaskStateCache()) {
            return;
        }

        return this.taskState[subjectId]?.[taskId];
    }

    setTaskState(subjectId: string, taskId: string, state: JSONSerializable): void {
        if (!this.withTaskStateCache()) {
            return;
        }

        if (!this.taskState[subjectId]) {
            this.taskState[subjectId] = {};
        }

        this.taskState[subjectId][taskId] = state;
    }
}

export default Cache;
