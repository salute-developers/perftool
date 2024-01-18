import { Serializable, spawn, execSync } from 'child_process';
import process from 'process';
import path from 'path';

import { Config } from '../config';
import { TestModule } from '../build/collect';
import { BuildResult } from '../build';

import Deferred from './deferred';
import CWD from './cwd';
import { debug } from './logger';

type CreateChildParams = {
    config: Config;
};

type Child = {
    testSubjectsCollectedPromise: Promise<TestModule[]>;
    clientBuiltPromise: Promise<Pick<BuildResult, 'subjectsDepsHashMap'>>;
    serverCreatedPromise: Promise<{ port: number; stop: () => void }>;
    shutdown: () => void;
};

type AbstractMessage<M extends string, T extends Serializable | void> = T extends void
    ? { type: M }
    : {
          type: M;
          payload: T;
      };

type TestModulesMessage = AbstractMessage<'testModules', { modules: TestModule[] }>;
type ClientBuiltMessage = AbstractMessage<'clientBuilt', { deps: [string, string][] }>;
type ServerCreatedMessage = AbstractMessage<'serverCreated', { port: number }>;

type ChildMessage = TestModulesMessage | ClientBuiltMessage | ServerCreatedMessage;

type ShutdownMessage = AbstractMessage<'shutdown', void>;

type ParentMessage = ShutdownMessage;

/**
 * utils/ipc.ts — helper methods which are used for parent and child processes' communication in collaborative mode.
 */

export function createChild({ config }: CreateChildParams): Child {
    debug('Spawn child', 'perftool', `cwd:${path.resolve(CWD, config.baselineRefDir!)}`);

    // createRequire somehow doesn't work
    const entryPath = execSync('node -p "require.resolve(\'@salutejs/perftool\')"', {
        cwd: path.resolve(CWD, config.baselineRefDir!),
        encoding: 'utf8',
    });

    const entry = path.resolve(entryPath, '../..', 'scripts/start.sh');

    const subProcess = spawn(entry, ['--logLevel', config.logLevel], {
        cwd: path.resolve(CWD, config.baselineRefDir!),
        env: {
            ...process.env,
            PERFTOOL_CHILD_MODE: 'true',
        },
        stdio: ['inherit', 'inherit', 'inherit', 'ipc'],
        shell: true,
    });

    const testSubjectsCollectedDeferred = new Deferred<TestModule[], Error>();
    const clientBuiltDeferred = new Deferred<Pick<BuildResult, 'subjectsDepsHashMap'>, Error>();
    const serverCreatedDeferred = new Deferred<{ port: number; stop: () => void }, Error>();

    subProcess.on('close', () => {
        const err = new Error('Child process has exited');
        testSubjectsCollectedDeferred.reject(err);
        clientBuiltDeferred.reject(err);
        serverCreatedDeferred.reject(err);
    });

    subProcess.on('error', (err) => {
        testSubjectsCollectedDeferred.reject(err);
        clientBuiltDeferred.reject(err);
        serverCreatedDeferred.reject(err);
    });

    const handler = (msg: ChildMessage) => {
        switch (msg.type) {
            case 'testModules':
                testSubjectsCollectedDeferred.resolve(msg.payload.modules);
                break;
            case 'clientBuilt':
                clientBuiltDeferred.resolve({
                    subjectsDepsHashMap: new Map(msg.payload.deps),
                });
                break;
            case 'serverCreated':
                serverCreatedDeferred.resolve({
                    port: msg.payload.port,
                    stop() {
                        const message: ShutdownMessage = {
                            type: 'shutdown',
                        };

                        subProcess.send(message);
                    },
                });
                subProcess.off('message', handler);
                break;
            default:
        }
    };

    subProcess.on('message', handler);

    return {
        testSubjectsCollectedPromise: testSubjectsCollectedDeferred.promise,
        clientBuiltPromise: clientBuiltDeferred.promise,
        serverCreatedPromise: serverCreatedDeferred.promise,
        shutdown: () => subProcess.kill('SIGINT'),
    };
}

export function sendTestModules(modules: TestModule[]): void {
    const msg: TestModulesMessage = { type: 'testModules', payload: { modules } };
    process.send!(msg);
}

export function sendClientBuilt(subjectsDepsHashMap: Map<string, string>): void {
    const msg: ClientBuiltMessage = { type: 'clientBuilt', payload: { deps: [...subjectsDepsHashMap.entries()] } };
    process.send!(msg);
}

export function sendServerCreated({ port, stop }: { port: number; stop: () => Promise<void> }): Promise<void> {
    const message: ServerCreatedMessage = { type: 'serverCreated', payload: { port } };
    process.send!(message);

    return new Promise((resolve) => {
        const handler = async (msg: ParentMessage) => {
            if (msg.type === 'shutdown') {
                process.off('message', handler);
                await stop();
                resolve();
            }
        };

        process.on('message', handler);
    });
}
