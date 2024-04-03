import React, { CSSProperties, useLayoutEffect } from 'react';

import { currentReport, previousReport, comparisonReport } from '../data';

import { getComponentsWithSignificantChanges } from './common';

type Props = {
    currentComponentId: string | null;
    setCurrentComponentId: (componentId: string) => void;
};

function componentIsNew(subjectId: string): boolean {
    return subjectId in currentReport.result && !(subjectId in (previousReport?.result || {}));
}

function getComponentList() {
    const componentsWithSignificantChanges = getComponentsWithSignificantChanges();
    const comparedComponents = [];
    const newComponents = [];

    if (comparisonReport) {
        for (const subjectId of Object.keys(comparisonReport.result)) {
            if (!componentsWithSignificantChanges.includes(subjectId) && !componentIsNew(subjectId)) {
                comparedComponents.push(subjectId);
            }
        }
    }

    for (const subjectId of Object.keys(currentReport.result)) {
        if (componentIsNew(subjectId)) {
            newComponents.push(subjectId);
        }
    }

    return { componentsWithSignificantChanges, comparedComponents, newComponents };
}

const { componentsWithSignificantChanges, comparedComponents, newComponents } = getComponentList();
const allComponentIds = [...componentsWithSignificantChanges, ...comparedComponents, ...newComponents];

const rootStyle: CSSProperties = {
    maxWidth: '25vw',
    width: '25vw',
    padding: '10px',
    borderRight: '1px solid #ddd',
    wordBreak: 'break-word',
};
const buttonStyle: CSSProperties = {
    all: 'unset',
};
const ulStyle: CSSProperties = {
    listStyle: 'none',
    display: 'flex',
    flexDirection: 'column',
};
const liStyle: CSSProperties = {
    padding: '10px',
    cursor: 'pointer',
};
const liCheckedStyle: CSSProperties = {
    borderLeft: '1px solid gray',
    padding: '10px 10px 10px 9px',
    cursor: 'none',
};

export default function NavigationBar({ currentComponentId, setCurrentComponentId }: Props) {
    useLayoutEffect(() => {
        if (!currentComponentId && allComponentIds[0]) {
            setCurrentComponentId(allComponentIds[0]);
        }
    }, [currentComponentId, setCurrentComponentId]);

    return (
        <div style={rootStyle}>
            <ul style={ulStyle}>
                {allComponentIds.map((componentId) => {
                    let node: React.ReactNode = componentId;

                    if (componentsWithSignificantChanges.includes(componentId)) {
                        node = <b>{node}</b>;
                    }

                    if (componentId !== currentComponentId) {
                        node = (
                            <button
                                style={buttonStyle}
                                type="button"
                                onClick={() => setCurrentComponentId(componentId)}
                            >
                                {node}
                            </button>
                        );
                    }

                    return (
                        <li
                            style={{ ...liStyle, ...(componentId === currentComponentId ? liCheckedStyle : {}) }}
                            key={componentId}
                        >
                            {node}
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}
