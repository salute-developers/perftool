import { ReportWithMeta } from '../index';
import { CompareReport } from '../../compare/process';
import { ClientConfig } from '../../config/common';

export const currentReport = process.env.PERFTOOL_REPORT_CURRENT as unknown as ReportWithMeta;
export const previousReport = process.env.PERFTOOL_REPORT_PREVIOUS as unknown as ReportWithMeta | undefined;
export const comparisonReport = process.env.PERFTOOL_REPORT_COMPARISON as unknown as CompareReport | undefined;
export const config = process.env.PERFTOOL_CONFIG as unknown as ClientConfig;
