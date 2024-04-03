import React, { useEffect, useState } from 'react';

import Layout from './Layout';
import Summary from './Summary';
import NavigationBar from './NavigationBar';
import Components from './Components';
import { State } from './common';
import Raw from './Raw';

export default function Root() {
    const [state, setState] = useState<State>(() => ({
        view: 'summary',
        currentComponentId: null,
        currentTaskId: null,
    }));

    useEffect(() => {
        window.scrollTo({ top: 0, left: 0 });
    }, [state.view, state.currentComponentId]);

    return (
        <Layout view={state.view} setView={(view) => setState({ ...state, view })}>
            {state.view === 'summary' && <Summary setState={(rest) => setState({ ...state, ...rest })} />}
            {state.view === 'raw' && <Raw />}
            {state.view === 'components' && (
                <>
                    <NavigationBar
                        currentComponentId={state.currentComponentId}
                        setCurrentComponentId={(currentComponentId: string) =>
                            setState({ ...state, currentComponentId })
                        }
                    />
                    <Components
                        currentComponentId={state.currentComponentId}
                        currentTaskId={state.currentTaskId}
                        setCurrentTaskId={(currentTaskId: string) => setState({ ...state, currentTaskId })}
                    />
                </>
            )}
        </Layout>
    );
}
