# Performance Monitoring System for React Components

[![NPM version](https://badge.fury.io/js/@salutejs%2Fperftool.svg)](https://www.npmjs.com/package/@salutejs/perftool)
[![@salutejs/perftool](https://snyk.io/advisor/npm-package/@salutejs/perftool/badge.svg)](https://snyk.io/advisor/npm-package/@salutejs/perftool)
[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](/LICENSE)

Keep your components blazingly fast and ship your React app with no doubt.

**🍌 Native Env**: benchmark your components in the environment they usually run in.

**🎰 CI Ready**: get it to work in your Pull Requests, it's really built for that.

**🎯 Stable Results** even in unsteady envs like GitHub runners and other virtual machines.

## Table of Contents

-   [Getting Started](#getting-started)
-   [Configuration](#configuration)
-   [Documentation](#documentation)
-   [Supported environments](#supported-environments)
-   [Contributing](#contributing)
-   [License](#license)

## Getting Started

Install Perftool using preferred package manager.

```bash
# Yarn
yarn add --dev @salutejs/perftool
```

```bash
# NPM
npm i -D @salutejs/perftool
```

```bash
# PNPM
pnpm add -D @salutejs/perftool
```

Let's get started by writing a test for a component. First, create a `Component.tsx` module:

```tsx
import React from 'react';

const Component = ({ prop }) => <div style="color: red;">{prop}</div>;

export default Component;
```

Then, create a module `Component.perf.tsx`. This is an entrypoint for Perftool to obtain the component:

```tsx
import React from 'react';
import Component from './Component';

export function Default() {
    return <Component prop="value" />;
}
```

Now run Perftool in preview mode to test the build and check if the component renders correctly.

```bash
npx perftool --preview *.perf.tsx
```

Then, we can proceed to the actual run with following command:

```bash
npx perftool -o base.json *.perf.tsx
```

After Perftool finishes the run, `base.json` report file will appear in the current directory.
Now let's change our component, so it takes noticeably more amount of time to render it:

```tsx
import React from 'react';

const Component = ({ prop }) => (
    <div>
        {[...Array(1000)].map(() => (
            <div style="color: red;">{prop}</div>
        ))}
    </div>
);

export default Component;
```

Run Perftool one more time with changed output filename:

```bash
npx perftool -o changed.json *.perf.tsx
```

After Perftool finishes the run, `changed.json` report file will appear in the current directory.
Finally, let's do the comparison of our reports:

```bash
npx perftool-compare -o result.json changed.json base.json
```

After Perftool does the comparison, `result.json` report file will appear in the current directory and an error will be thrown owing to bad significant change in the reported metrics.

**🎉 Well done! You just successfully done your first performance test with Perftool!**

## Configuration

To make an additional configuration, create `perftool.config.mts` file in the root of your project, or provide a config file path with `-c <path>` option when running Perftool. Here's example config:

```typescript
import type { Config } from '@salutejs/perftool';

const config: Config = {
    retries: 30,
    include: ['src/**/*.perf.tsx'],
    displayIntermediateCalculations: false,
    failOnSignificantChanges: false,
    modifyWebpackConfig(conf) {
        /**
         * Customize the build if needed
         */
        return conf;
    },
};

export default config;
```

Check out all the config settings and description [here](/packages/perftool/lib/config/common.ts).

Here's [example config](https://github.com/salute-developers/plasma/blob/master/perftool.config.mts).

## Documentation

There are no fancy-github-hosted docs right now, so this section consists of useful links and some nice perftool feature specs.

### beforeTest

You can run code before Perftool renders the component. This code will be run in the browser, so at this stage you can mock data through the global object.

```tsx
import React from 'react';
import Component from './Component';

export function Default() {
    return <Component prop="value" propX={window.mock} />;
}

Default.beforeTest = () => {
    window.mock = 123;
};
```

#### intercept

Using the intercept method, you can intercept requests and return prepared data. Useful if you need to mock some endpoint, image or file, or cancel some request (see [typings](/packages/perftool/lib/api/intercept.ts)).

```tsx
import React from 'react';
import { intercept } from '@salutejs/perftool';
import Component from './Component';

export function Default() {
    return <Component prop="value" />;
}

Default.beforeTest = async () => {
    await intercept({
        method: 'POST',
        source: '**/api/bx/v1/ecom/basket/page.php*', // glob-pattern
        response: 'src/util/perftool/fixtures/basket.json', // file path
    });
    await intercept({
        method: 'GET',
        responseType: 'json',
        source: '**/api/bx/v1/ecom/lk/page.php*',
        response: { foo: 'bar' },
    });
    await intercept({
        // any http method
        responseType: 'abort',
        source: '**/api/bx/v1/ecom/baz/page.php*',
    });
};
```

#### setViewport

Using the setViewport method, you can specify the size of the viewport for rendering the current component. See [typings](/packages/perftool/lib/api/viewport.ts)

```tsx
import React from 'react';
import { setViewport } from '@salutejs/perftool';
import Component from './Component';

export function Default() {
    return <Component prop="value" />;
}

Default.beforeTest = async () => {
    await setViewport('desktop'); // 'desktop' and 'touch' are built-in presets
};
```

### Results interpretation

Most often the following situation will occur: everything is fine, no degradation.
In this case, there is no need to do anything - we will assume that nothing bad happened.
Now let's look at the case when perftool-compare threw an error.
The result of the performance test is a comparison of the results of runs in the base and feature branches.
Here is an example of such a report, most of the fields have been omitted for readability:

```json
{
    "hasSignificantNegativeChanges": true,
    "result": {
        "Component.perf.tsx#Default": {
            "render": {
                "mean": {
                    "old": [10, 2],
                    "new": [20, 4],
                    "change": {
                        "difference": 10,
                        "percentage": 100,
                        "significanceRank": "high"
                    }
                }
            }
        }
    }
}
```

The top-level part of the report is a field with the boolean data type **hasSignificantNegativeChanges**, which means whether there are components in the report with statistically significant negative changes. Its value is determined based on the comparison results for each component and metric. In the config you can specify which specific metrics will be aggregated in **hasSignificantNegativeChanges**.

In this case, we detect **hasSignificantNegativeChanges: true**, and now we need to find the reason. We are looking for a metric with `change.significanceRank === 'high'` and `difference > 0`. This can be one or more components/metrics. Once we have found all the candidates for degradation, we move on to the next step.

Now you need to check whether the component that failed the test has actually changed. If the component was not directly or indirectly affected in this branch, then the result is false-positive and can be ignored - sometimes on machines where jobs are run, a load change occurs, which can lead to incorrect results.

At this stage, you can begin searching for degradation in the changed component. If you are not sure if degradation actually happened, you can run a check one more time.

### Example of CI job

See [here](https://github.com/salute-developers/plasma/blob/master/.github/workflows/performance-test-pr.yml).

## Supported environments

We follow Node maintenance cycle.

| Node | 14  | 16  | 18  | 20  |
| :--: | :-: | :-: | :-: | :-: |
|      | ❌  | ✅  | ✅  | ✅  |

| React | <= 16.8 | ^16.8 | ^17 | ^18 |
| :---: | :-----: | :---: | :-: | :-: |
|       |   ❌    |  ✅   | ✅  | ✅  |

Windows support is not currently planned.

| OS  | Windows | MacOS | Linux |
| :-: | :-----: | :---: | :---: |
|     |   ❌    |  ✅   |  ✅   |

## Contributing

Check out [Contribution guide](/CONTRIBUTING.md). All types of contributions are encouraged and valued.

## License

Perftool is [MIT licensed](/LICENSE).
