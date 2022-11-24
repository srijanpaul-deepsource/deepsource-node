# DeepSource Node

A JavaScript API to fetch data from [DeepSource](https://www.deepsource.io).

## Usage

Start by importing the library:

```javascript
import DeepSource from "deepsource-node";
// or require("deepsource-node")
```

Then use your [Personal Access Token](https://deepsource.io/docs/api/personal-access-token/)
to create a driver.

```js
const deepsource = new DeepSourceAPI("<your personal access token>");
```

Now, you can use fetch data from the API using the driver:

```js
const repo = await deepsource.getRepo("repo-name", "user-name");
console.log(repo);
```

`repo` will look like this:

```js
{
  defaultBranch: 'master',
  dsn: 'https://a945758ecdbf4ce4872a6da96e3f90b4@deepsource.io',
  isPrivate: false,
  runIds: [Array]
}
```

To fetch all active issues in the repo:

```js
// All issues raised by DeepSource:
const allIssues = await deepsource.getAllIssuesInRepo("repo-name", "user-name");
console.log(allIssues);
```

Output:

```js
 [{
    issue: {
      code: 'JS-D023',
      title: 'Unsafe `child_process` non-literal',
      category: 'SECURITY',
      tags: [Array]
    },
    path: 'index.js',
    beginColumn: 1,
    beginLine: 35,
    endColumn: 20,
    endLine: 35
  },
  ... 100 more items
]
```

Or, you can make an arbitrary GraphQL query by following the [schema in the docs](https://deepsource.io/docs/api/overview).
For such requests, the response will be a `Record<string, any>`, instead of having proper type definitions.

```javascript
deepsource.fetch(`query {
  run(runUid:"") {
    checks {
      totalCount
      edges {
        node {
          analyzer { name }
        }
      }
    }
  }
}`);
```
