const aws = require('aws-sdk')
aws.config.update({
  accessKeyId: 'XXXXXXXXXXXXXXXXXXX',
  secretAccessKey: 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
  region: 'sa-east-1'
})
const snsConfigure = require('./index')

async function configure () {
  try {
    const topic = await snsConfigure.createOrGetSNSTopicByName('topic-name')
    await snsConfigure.configureSQSSubscriptionWithPermissions({
      topicArn: topic.TopicArn,
      sqsArn: 'arn:aws:sqs:sa-east-1:XXXXXXXXXXXX:queue-name'
    })
    console.log(`Uuuuhuul, sqs queue subscribed and configured to receive messages from ${topic.TopicArn}`)
  } catch (err) {
    console.log('Ooooooops, something wrong happens D:')
  }
}

configure()
