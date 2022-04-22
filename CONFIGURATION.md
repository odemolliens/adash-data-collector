# Configuration

Example of configuration can be found at config.example.json

## Collector

The collector seciont is the main part where you can activate various metrics collection.

### GitLab

- `status: boolean` Collect status from status.gitlab.com
- `metrics: boolean` Collect metrics such as MR requests, pipelines etc...
- `projectId: string` Project id
- `token: string` API Auth Token

### BrowserStack

- `status: boolean` Collect status from status.browserstack.com
- `metrics: boolean` Collect metrics such as recent builds
- `token: string` API Auth Token

### CodeMagic

- `appId: string`
- `metrics: boolean` Collect metrics such as recent builds
- `token: string` API Auth Token

### Bitrise

- `status: boolean` Collect status from status.bitrise.com
- `metrics: boolean` Collect metrics such as build queue and workflows builds
- `appSlug: string` App Slug
- `token: string` API Auth Token
- `workflows: string[]` List of workflows to collect build status from

### NPM

- `status: boolean` Collect status from status.npm.com

### Gradle

- `status: boolean` Collect status from status.gradle.com

### CocoaPods

- `status: boolean` Collect status from status.cocoapods.com

## Notificator

### Monitor

Check and send a notification to the channel/s.

Example of notification:

`ℹ️ GitLab Open MR monitor: 21`

```json
"GitLab Open MR": { // part of notification message
  "key": "GitlabOpenMergeRequestsCount", // key to check
  "filename": "gitlab.json", // file containing the metric
  "notification": true, // flag to activate/deactivate the notification
  "channels": ["#slack1", "#slack2", "#teams1"] // list of channels to send the notifications
}
```

### Status

Check the status and send a notification to the channel/s, can also open an incident on the project Gitlab's issues page.

Example of notification:

`🔥 Gradle status Partially Degraded Service`

```json
"Gradle": { // part of notification message
  "key": "GradleStatus.status", // key to check
  "filename": "status.json", // file containing the metric
  "success": "operational", // the key should be different than the success string (could be configured also with a list of success strings)
  "incident": true, // flag to activate/deactivate creation of incident
  "notification": true, // flag to activate/deactivate the notification
  "severity": "high", // notification/incident severity
  "channels": ["#slack1", "#teams1"] // list of channels to send the notifications
}
```

### Thresholds

Check the metrics and when a certain metric go above the threshold, send a notification to the channel/s, can also open an incident on the project Gitlab's issues page.

Example of notification:

`🔥 GitLab Open MR threshold reached: 21 > 20`

```json
"GitLab Open MR": { // part of notification message
  "key": "GitlabOpenMergeRequestsCount", // key to check
  "filename": "gitlab.json", // file containing the metric
  "max": 20, // thresholds
  "incident": true, // flag to activate/deactivate creation of incident
  "notification": true, // flag to activate/deactivate the notification
  "severity": "high", // notification/incident severity
  "channels": ["#slack1", "#teams1"] // list of channels to send the notifications
},
```

### Channels

Configure one ore more channels to enable notifications.
The supported platform are Slack and Teams, the notification will be sent using webhook and it must be enabled on the chat provider.

```json
"slack": { // slack channels
  "#slack1": { // channel name (it will be used in the configurations above)
    "username": "adash-data-collector script", // username
    "webhookURL": "WEBHOOK_URL" // webhook
  },
  "#slack2": {
    "username": "adash-data-collector script",
    "webhookURL": "WEBHOOK_URL"
  }
},

"teams": { // teams
  "#teams1": {
    "webhookURL": "WEBHOOK_URL" // webhook
  }
}
```

## Data dirs

- `dataDir` directory to store the collected metrics
- `kpiDataDir` directory to store the kpi metrics (after the process the kpi json will be stored in the configured `dataDir`)

## Envs

Extra configurations, it's possible to define those configuration as user ENV variables.

```json
"envs": {
  // in case of error during the execution of the script it is possible to send notification to those webhooks
  "SLACK_WEBHOOK_URL": "WEBHOOK_URL",
  "TEAMS_WEBHOOK_URL": "WEBHOOK_URL",

  // repository used to collect incidents
  "ADASH_GITLAB_PROJECTID_TOKEN": "ADASH_PROJECT_ID",
  "ADASH_GITLAB_TOKEN": "ADASH_PROJECT_TOKEN"
}
```
