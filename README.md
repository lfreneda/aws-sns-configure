# aws-sns-configure
![Field Control ♥](https://img.shields.io/badge/Field%20Control-%20%20%20%20%20%20♥-blue.svg)
[![Maintainability](https://api.codeclimate.com/v1/badges/22b6ac4cf8b8207fa2bb/maintainability)](https://codeclimate.com/github/lfreneda/aws-sns-configure/maintainability)

:email: High level interface to configure SQS subscriptions (with permissions) to SNS

### Installation

```
npm install aws-sns-configure --save-dev
```

### Usage

```javascript
const aws = require('aws-sdk')
aws.config.update({
  accessKeyId: 'XXXXXXXXXXXXXXXXXXX',
  secretAccessKey: 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
  region: 'sa-east-1'
})
const snsConfigure = require('./index')

const topic = await snsConfigure.createOrGetSNSTopicByName('topic-name')
await snsConfigure.configureSQSSubscriptionWithPermissions({
  topicArn: topic.TopicArn,
  sqsArn: 'arn:aws:sqs:sa-east-1:XXXXXXXXXXXX:queue-name'
})
```
