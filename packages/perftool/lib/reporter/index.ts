import * as os from 'os';
import path from 'path';
import fsPromises from 'fs/promises';

import { StatsReport } from '../statistics';
import { debug, info } from '../utils/logger';
import { TestModule } from '../build/collect';
import { Config } from '../config';
import getCurrentVersion from '../utils/version';
import { id as staticTaskSubjectId } from '../stabilizers/staticTask';
import CWD from '../utils/cwd';

export type ReportWithMeta = {
    version: string;
    jobs: number;
    retries: number;
    timestamp: number;
    duration: number;
    averageLoad: number[];
    freeMemory: number;
    cachedTestIds: string[];
    staticTaskResult?: StatsReport[string];
    result: StatsReport;
};

type GenerateReportParams = {
    config: Config;
    data: StatsReport;
    testModules: TestModule[];
    actualTestModules: TestModule[];
};

let startTime: number;

export function measureStartingPoint() {
    startTime = performance.now();
}

export async function report(statsStream: AsyncGenerator<StatsReport, undefined>): Promise<void> {
    for await (const statsReport of statsStream) {
        info(JSON.stringify(statsReport, null, 4));
    }
}

function getSubjectIdToReadableNameMap(testModules: TestModule[]) {
    return testModules.reduce(
        (acc, { subjects, path: modulePath }) => {
            subjects.forEach(({ id, originalExportedName }) => {
                acc[id] = `${path.relative(CWD, path.resolve(CWD, modulePath))}#${originalExportedName}`;
            });

            return acc;
        },
        {} as { [k: string]: string },
    );
}

function getCachedTestIds(allTestModules: TestModule[], actualTestModules: TestModule[]): string[] {
    const allSubjectIds = allTestModules.reduce((acc, { subjects }) => {
        acc.push(...subjects.map(({ id }) => id));
        return acc;
    }, [] as string[]);
    const actualSubjectIds = actualTestModules.reduce((acc, { subjects }) => {
        acc.push(...subjects.map(({ id }) => id));
        return acc;
    }, [] as string[]);

    return allSubjectIds.filter((id) => !actualSubjectIds.includes(id));
}

export async function generateReport({ config, data, testModules, actualTestModules }: GenerateReportParams) {
    debug('writing report');
    const subjectIdToReadableNameMap = getSubjectIdToReadableNameMap(testModules);

    const reportWithMeta: ReportWithMeta = {
        version: await getCurrentVersion(),
        jobs: config.jobs,
        retries: config.retries,
        timestamp: Date.now(),
        duration: Math.round(performance.now() - startTime),
        averageLoad: os.loadavg(),
        freeMemory: os.freemem(),
        cachedTestIds: getCachedTestIds(testModules, actualTestModules).map((id) => subjectIdToReadableNameMap[id]),
        result: Object.fromEntries(
            Object.entries(data)
                .filter(([k]) => k !== staticTaskSubjectId)
                .map(([k, v]) => [subjectIdToReadableNameMap[k], v]),
        ),
    };

    if (staticTaskSubjectId in data) {
        reportWithMeta.staticTaskResult = data[staticTaskSubjectId];
    }

    const contents = JSON.stringify(reportWithMeta, null, 2);
    const fileName = path.resolve(CWD, config.outputFilePath.replace('[time]', new Date().toISOString()));

    await fsPromises.mkdir(path.dirname(fileName), { recursive: true });
    await fsPromises.writeFile(fileName, contents, { encoding: 'utf-8' });

    info('Report is successfully written to', fileName);
}
