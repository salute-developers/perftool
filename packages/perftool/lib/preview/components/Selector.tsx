import React, { CSSProperties, ChangeEvent } from 'react';

type Props = {
    subjectsIds: string[];
    onSelect: (index: number) => void;
    currentIndex: number;
    style: CSSProperties;
};

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
            <select onChange={handleChange}>
                {subjectsIds.map((id, index) => (
                    <option key={index} selected={index === currentIndex} value={index}>
                        {id}
                    </option>
                ))}
            </select>
        </div>
    );
}

export default Selector;
