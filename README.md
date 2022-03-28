# Getting started

To setup the project run the following commands

- `yarn install`
- `yarn build`

# Develop

Open 2 terminals, one for each of the following commands:

1. `yarn watch:build`
2. `yarn watch:test`

## Add a new script

1. Place the new script in the scripts folder
2. Edit the file cli.ts and add the command that will invoke the script

## Debug

Add one or more of the following flags to enable certain features (ex `DEBUG=1 node bin/adash-data-collector collect`)

- `DEBUG=1` to enable debug logs
- `DEBUG_NETWORK=1` to enable network debug logs

## Lint, Coverage, Test...

- `yarn fix` to run the linter and automatically fix your code
- `yarn cov` to generate and open the project coverage
- `yarn test` to run the unit tests
- `yarn doc` to generate and open the documentation

# Available scripts

For a list of available scripts and their usage run the command:
`node bin/adash-data-collector --help`

1. `notificator`
2. `collect`
3. `collect:browerstack`
4. `collect:gitlab`
5. `collect:bitrise`
6. `collect:status`

# Configuration

Rename the file config.example.json to config.json and apply the configuration
