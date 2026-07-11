# allinme.web-client

React + TypeScript web client built with Vite.

## Development

```sh
npm install
npm run dev
```

Run the local quality gates with:

```sh
npm test
npm run build
npm run lint
```

Protocol conformance tests consume fixtures from the sibling `schema-ui-docs` repository by default. Set `SCHEMA_UI_FIXTURES` to override the fixture directory. CI checks out `magicvr/schema-ui-docs` at commit `152501fb1b8cade02f2780d96a82b5ceb2f5d281` so fixture inputs cannot drift between runs.