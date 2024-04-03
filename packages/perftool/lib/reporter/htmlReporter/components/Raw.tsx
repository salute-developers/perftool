import React, { ChangeEvent, CSSProperties, useState } from 'react';
import { JSONTree } from 'react-json-tree';

import { comparisonReport, currentReport, previousReport } from '../data';

const options = [
    {
        name: 'Previous',
        data: previousReport,
    },
    {
        name: 'Current',
        data: currentReport,
    },
    {
        name: 'Comparison',
        data: comparisonReport,
    },
] as const;

const rootStyle: CSSProperties = {
    maxWidth: '75vw',
    width: '75vw',
    padding: '10px',
};

const chooserStyle: CSSProperties = {
    padding: '10px',
};

export default function Raw() {
    const [currentOption, setCurrentOption] = useState<number>(2);
    function handleChange(e: ChangeEvent<HTMLSelectElement>) {
        const value = Number(e.target.value);
        setCurrentOption(value);
    }

    return (
        <div style={rootStyle}>
            <div style={chooserStyle}>
                <span>Choose report: </span>
                <select onChange={handleChange} value={currentOption}>
                    {options.map(({ name }, index) => (
                        <option key={index} value={index}>
                            {name}
                        </option>
                    ))}
                </select>
            </div>
            <JSONTree data={options[currentOption].data} />
        </div>
    );
}
