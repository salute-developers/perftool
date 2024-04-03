import React, { CSSProperties } from 'react';

import { currentReport, previousReport, comparisonReport } from '../data';

import { getComponentsWithSignificantChanges, State } from './common';

type Props = {
    setState: (s: Pick<State, 'view' | 'currentComponentId'>) => void;
};

function getCachedTestIds() {
    if (!previousReport) {
        return [];
    }

    const previousCached = previousReport.cachedTestIds;
    const currentCached = currentReport.cachedTestIds;

    if (previousCached.length < currentCached.length) {
        return previousCached;
    }

    return currentCached;
}

const componentsWithSignificantChanges = getComponentsWithSignificantChanges();
const isOk = !comparisonReport?.hasSignificantNegativeChanges;
const cachedTestIds = getCachedTestIds();
const isVersionChanged = !!comparisonReport?.isVersionChanged;
const time = new Date(comparisonReport?.timestamp || currentReport.timestamp);

const rootStyle: CSSProperties = {
    width: '50vw',
};
const blockStyle: CSSProperties = {
    padding: '5px 0',
};
const cachedStyle: CSSProperties = {
    padding: '2px 10px',
};
const warningStyle: CSSProperties = {
    color: 'gray',
    marginTop: '-20px',
};
const ulStyle: CSSProperties = {
    listStyle: 'none',
    display: 'flex',
    flexDirection: 'column',
};
const liStyle: CSSProperties = {
    padding: '10px',
    cursor: 'pointer',
    borderLeft: '1px solid red',
    marginBottom: '10px',
};
const buttonStyle: CSSProperties = {
    fontWeight: 500,
    all: 'unset',
};

export default function Summary({ setState }: Props) {
    return (
        <div style={rootStyle}>
            <h1>Summary</h1>
            <h2>
                Status: <b style={{ color: isOk ? 'limegreen' : 'red' }}>{isOk ? 'OK' : 'FAIL'}</b>
            </h2>
            {isVersionChanged && (
                <div style={{ ...warningStyle, ...blockStyle }}>
                    Likely not valid, version changed ({previousReport?.version} → {currentReport.version})
                </div>
            )}
            <div style={blockStyle}>Run completed at {time.toLocaleString()}</div>
            <div style={blockStyle}>
                <details>
                    <summary>Cached {cachedTestIds.length} tests</summary>
                    <div style={blockStyle}>
                        {cachedTestIds.map((testId) => (
                            <div style={cachedStyle}>{testId}</div>
                        ))}
                    </div>
                </details>
            </div>
            {!!componentsWithSignificantChanges.length && (
                <div style={blockStyle}>
                    <h3>Significant changes</h3>
                    <ul style={ulStyle}>
                        {componentsWithSignificantChanges.map((id) => (
                            <li style={liStyle}>
                                <button
                                    type="button"
                                    style={buttonStyle}
                                    onClick={() => setState({ view: 'components', currentComponentId: id })}
                                >
                                    {id} →
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
