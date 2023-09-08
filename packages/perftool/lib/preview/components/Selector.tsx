import React, { CSSProperties, ChangeEvent } from 'react';

type Props = {
    subjectsIds: string[];
    onSelect: (index: number) => void;
    currentIndex: number;
    style: CSSProperties;
};

const readableNamesMap = process.env.PERFTOOL_PREVIEW_READABLE_NAMES as unknown as Record<string, string>;
const rootStyle = { display: 'flex', flexDirection: 'row' } as const;
const labelStyle = { paddingRight: '1rem' } as const;

function Selector({ style, subjectsIds, onSelect, currentIndex }: Props) {
    function handleChange(e: ChangeEvent<HTMLSelectElement>) {
        const index = Number(e.target.value);
        onSelect(index);
    }

    return (
        <div style={{ ...style, ...rootStyle }}>
            <div style={labelStyle}>Component: </div>
            <select onChange={handleChange} value={currentIndex}>
                {subjectsIds.map((id, index) => (
                    <option key={index} value={index}>
                        {readableNamesMap[id]}
                    </option>
                ))}
            </select>
        </div>
    );
}

export default Selector;
