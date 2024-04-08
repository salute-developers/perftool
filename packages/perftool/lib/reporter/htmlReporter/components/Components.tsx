import React, { ChangeEvent, CSSProperties, useLayoutEffect, useMemo } from 'react';
import { Chart, CategoryScale, LinearScale, Title, Tooltip, PointElement, LineElement } from 'chart.js';
import { Line } from 'react-chartjs-2';
import annotationPlugin from 'chartjs-plugin-annotation';
import autocolors from 'chartjs-plugin-autocolors';

import { comparisonReport, currentReport, previousReport } from '../data';
import { jitter, qrdeHD } from '../../../utils/statistics';

Chart.register(annotationPlugin, autocolors, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip);

type Props = {
    currentComponentId: string | null;
    currentTaskId: string | null;
    setCurrentTaskId: (taskId: string) => void;
};

const rootStyle: CSSProperties = {
    maxWidth: '75vw',
    width: '75vw',
    padding: '20px',
};
const taskChooserStyle: CSSProperties = {
    padding: '10px',
};
const blockStyle: CSSProperties = {
    padding: '5px 5px 5px 10px',
};

export default function Components({ currentComponentId, currentTaskId, setCurrentTaskId }: Props) {
    useLayoutEffect(() => {
        if (!currentTaskId && currentComponentId) {
            setCurrentTaskId(Object.keys(currentReport.result[currentComponentId])[0]);
        }
    }, [currentComponentId, currentTaskId, setCurrentTaskId]);

    function handleChange(e: ChangeEvent<HTMLSelectElement>) {
        const { value } = e.target;
        setCurrentTaskId(value);
    }

    const currentDensityEstimation = useMemo(() => {
        if (!currentComponentId || !currentTaskId) {
            return null;
        }

        const observations = jitter(
            (currentReport.result[currentComponentId][currentTaskId] as any).observations as number[],
        );
        const { quantiles, heights } = qrdeHD(observations, 2 / observations.length);
        const data = {
            labels: quantiles.map((q) => q.toFixed(2)),
            datasets: [
                {
                    data: heights,
                },
            ],
        };
        const options = {
            responsive: true,
            plugins: { title: { display: true, text: 'Density Estimation (current)' } },
        };

        return <Line options={options} data={data} />;
    }, [currentComponentId, currentTaskId]);
    const previousDensityEstimation = useMemo(() => {
        if (
            !currentComponentId ||
            !currentTaskId ||
            !previousReport ||
            !(currentComponentId in previousReport.result)
        ) {
            return null;
        }

        const observations = jitter(
            (previousReport.result[currentComponentId][currentTaskId] as any).observations as number[],
        );
        const { quantiles, heights } = qrdeHD(observations, 2 / observations.length);
        const data = {
            labels: quantiles.map((q) => q.toFixed(2)),
            datasets: [
                {
                    data: heights,
                },
            ],
        };
        const options = {
            responsive: true,
            plugins: { title: { display: true, text: 'Density Estimation (previous)' } },
        };

        return <Line options={options} data={data} />;
    }, [currentComponentId, currentTaskId]);

    const fullMetrics = useMemo(() => {
        if (!currentComponentId || !currentTaskId) {
            return null;
        }

        const result: React.ReactNode[] = [];

        if (comparisonReport) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { __comparable, modes, ...metrics } = comparisonReport.result[currentComponentId][
                currentTaskId
            ] as any;

            for (const [metricId, { change, old, new: newRes }] of Object.entries(metrics) as any) {
                const isSignificantChange = change?.significanceRank === 'high';
                let oldLabel = null;
                let newLabel = null;
                let changeLabel = null;

                if (old) {
                    if (Array.isArray(old)) {
                        oldLabel = `${old[0].toFixed(2)} ± ${old[1].toFixed(2)}`;
                    } else {
                        oldLabel = old.toFixed(2);
                    }

                    oldLabel = <span>{oldLabel} → </span>;
                }

                if (Array.isArray(newRes)) {
                    newLabel = (
                        <span>
                            {newRes[0].toFixed(2)} ± {newRes[1].toFixed(2)}
                        </span>
                    );
                } else {
                    newLabel = <span>{newRes.toFixed(2)}</span>;
                }

                if (change) {
                    const { percentage } = change;
                    changeLabel = (
                        <span>
                            ({percentage > 0 ? '+' : ''}
                            {percentage}%)
                        </span>
                    );
                }

                result.push(
                    <div style={blockStyle}>
                        <b style={{ marginRight: '10px' }}>{metricId}</b>
                        {oldLabel} {newLabel} {changeLabel}
                        {isSignificantChange ? <span style={{ color: 'red' }}> significant</span> : ''}
                    </div>,
                );
            }

            if (modes && !Array.isArray(modes)) {
                result.push(
                    <div style={blockStyle}>
                        <b>Mode count</b>
                        {`${modes.old?.length} → `}
                        {modes.new.length}
                    </div>,
                );
            }
        }

        return result;
    }, [currentComponentId, currentTaskId]);
    const perModeMetrics = useMemo(() => {
        if (!currentComponentId || !currentTaskId) {
            return null;
        }

        const result: React.ReactNode[] = [];

        if (comparisonReport) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { modes } = comparisonReport.result[currentComponentId][currentTaskId] as any;
            if (!Array.isArray(modes)) {
                return [];
            }

            for (let i = 0; i < modes.length; ++i) {
                const mode = modes[i];
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { __comparable, ...metrics } = mode;

                result.push(<h3 style={taskChooserStyle}>Mode #{i + 1}</h3>);

                for (const [metricId, { change, old, new: newRes }] of Object.entries(metrics) as any) {
                    const isSignificantChange = change?.significanceRank === 'high';
                    let oldLabel = null;
                    let newLabel = null;
                    let changeLabel = null;

                    if (old) {
                        if (Array.isArray(old)) {
                            oldLabel = `${old[0].toFixed(2)} ± ${old[1].toFixed(2)}`;
                        } else {
                            oldLabel = old.toFixed(2);
                        }

                        oldLabel = <span>{oldLabel} → </span>;
                    }

                    if (Array.isArray(newRes)) {
                        newLabel = (
                            <span>
                                {newRes[0].toFixed(2)} ± {newRes[1].toFixed(2)}
                            </span>
                        );
                    } else {
                        newLabel = <span>{newRes.toFixed(2)}</span>;
                    }

                    if (change) {
                        const { percentage } = change;
                        changeLabel = (
                            <span>
                                ({percentage > 0 ? '+' : ''}
                                {percentage}%)
                            </span>
                        );
                    }

                    result.push(
                        <div style={blockStyle}>
                            <b style={{ marginRight: '10px' }}>{metricId}</b>
                            {oldLabel} {newLabel} {changeLabel}
                            {isSignificantChange ? <span style={{ color: 'red' }}> significant</span> : ''}
                        </div>,
                    );
                }
            }
        }

        return result;
    }, [currentComponentId, currentTaskId]);

    return (
        <div style={rootStyle}>
            <div style={taskChooserStyle}>
                <span>Task: </span>
                <select onChange={handleChange} value={currentTaskId || ''}>
                    {!!currentComponentId &&
                        Object.keys(currentReport.result[currentComponentId]).map((taskId, index) => (
                            <option key={index} value={taskId}>
                                {taskId}
                            </option>
                        ))}
                </select>
            </div>
            <div>
                {currentDensityEstimation}
                {previousDensityEstimation}
            </div>
            <h1 style={taskChooserStyle}>Metrics</h1>
            <div>
                {fullMetrics}
                {perModeMetrics}
            </div>
        </div>
    );
}
