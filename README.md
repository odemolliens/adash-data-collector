# Getting started

To setup the project run the following commands

- `yarn install`
- `yarn build`

## Add a new script

1. Place the new script in the scripts folder
2. Edit the file adash-data-collector.ts and add the command that will invoke the script

## Debug

Add one or more of the following flags to enable certain features (ex `DEBUG=1 npx ts-node adash-data-collector collect`)

- `DEBUG=1` to enable debug logs
- `DEBUG_NETWORK=1` to enable network debug logs

## Lint, Coverage, Test...

- `yarn fix` to run the linter and automatically fix your code

# Available scripts

For a list of available scripts and their usage run the command:
`npx ts-node adash-data-collector --help`

# Configuration

check [CONFIGURATION.md](CONFIGURATION.md)
