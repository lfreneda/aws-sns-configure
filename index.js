const aws = require('aws-sdk')
let sns = null
let sqs = null

const init = (awsConfig) => {
  aws.config.update(awsConfig)
  sns = new aws.SNS()
  sqs = new aws.SQS()
}

const randomNumber = () => {
  return Math.floor(10000000000 + Math.random() * 90000000000)
}

const rejectIfErrResolveIfResult = (resolve, reject) => {
  return (err, result) => {
    if (err) {
      return reject(err)
    }
    return resolve(result)
  }
}

const listSubscriptionsByTopic = (topicArn, nextToken) => {
  return new Promise((resolve, reject) => {
    sns.listSubscriptionsByTopic({
      TopicArn: topicArn,
      NextToken: nextToken
    }, rejectIfErrResolveIfResult(resolve, reject))
  })
}

const getQueuePolicyAttributes = (queueUrl) => {
  return new Promise((resolve, reject) => {
    sqs.getQueueAttributes({
      QueueUrl: queueUrl,
      AttributeNames: ['Policy']
    }, rejectIfErrResolveIfResult(resolve, reject))
  })
}

const createOrGetSNSTopicByName = (topicName) => {
  return new Promise((resolve, reject) => {
    sns.createTopic({
      Name: topicName
    }, rejectIfErrResolveIfResult(resolve, reject))
  })
}

const getSQSSubscription = async ({
  topicArn,
  sqsArn
}) => {
  const subscriptionsResult = await listSubscriptionsByTopic(topicArn)
  const subscription = subscriptionsResult.Subscriptions.find((subscription) => {
    return subscription.Endpoint === sqsArn
  })
  if (subscription && subscription.Protocol === 'sqs') {
    const splittedArn = subscription.Endpoint.split(':')
    subscription.EndpointUrl = `https://${splittedArn[2]}.${splittedArn[3]}.amazonaws.com/${splittedArn[4]}/${splittedArn[5]}`
  }
  return subscription
}

const getSQSPolicyPermissions = async ({
  queueUrl
}) => {
  const queueAttributes = await getQueuePolicyAttributes(queueUrl)
  if (queueAttributes && queueAttributes.Attributes && queueAttributes.Attributes.Policy) {
    return JSON.parse(queueAttributes.Attributes.Policy)
  }
  return null
}

const getSQSTopicPermission = ({
  policyPermissions,
  topicArn
}) => {
  const topicPermission = policyPermissions.Statement.find((item) => {
    if (item &&
      item.Condition &&
      item.Condition.ArnEquals &&
      item.Condition.ArnEquals['aws:SourceArn']) {
      return item.Condition.ArnEquals['aws:SourceArn'] === topicArn
    }
    return false
  })
  return topicPermission
}

const createSQSTopicPermission = ({ sqsArn, topicArn }) => {
  return {
    Sid: `Sid${randomNumber()}`,
    Effect: 'Allow',
    Principal: {
      AWS: '*'
    },
    Action: 'SQS:SendMessage',
    Resource: sqsArn,
    Condition: {
      ArnEquals: {
        'aws:SourceArn': topicArn
      }
    }
  }
}

const getSQSQueueUrl = ({ queueName }) => {
  return new Promise((resolve, reject) => {
    sqs.getQueueUrl({ QueueName: queueName }, rejectIfErrResolveIfResult(resolve, reject))
  })
}

const createSQSPermissions = async ({ queueUrl, sqsArn, sendMessagePermission }) => {
  return new Promise((resolve, reject) => {
    sqs.setQueueAttributes({
      Attributes: {
        'Policy': JSON.stringify({
          'Version': '2012-10-17',
          'Id': `${sqsArn}/SQSDefaultPolicy`,
          'Statement': [sendMessagePermission]
        })
      },
      QueueUrl: queueUrl
    }, rejectIfErrResolveIfResult(resolve, reject))
  })
}

const setSQSPermissions = async ({ queueUrl, policyPermissions }) => {
  return new Promise((resolve, reject) => {
    sqs.setQueueAttributes({
      Attributes: {
        'Policy': JSON.stringify(policyPermissions)
      },
      QueueUrl: queueUrl
    }, rejectIfErrResolveIfResult(resolve, reject))
  })
}

const subscribeSQSOnSNSTopic = ({ topicArn, sqsArn }) => {
  return new Promise((resolve, reject) => {
    sns.subscribe({
      Protocol: 'sqs',
      TopicArn: topicArn,
      Endpoint: sqsArn,
      ReturnSubscriptionArn: true
    }, rejectIfErrResolveIfResult(resolve, reject))
  })
}

const configureSQSSubscriptionWithPermissions = async ({ topicArn, sqsArn }) => {
  let subscription = await getSQSSubscription({
    topicArn: topicArn,
    sqsArn: sqsArn
  })
  if (!subscription) {
    await subscribeSQSOnSNSTopic({
      topicArn: topicArn,
      sqsArn: sqsArn
    })
    subscription = await getSQSSubscription({
      topicArn: topicArn,
      sqsArn: sqsArn
    })
  }

  const policyPermissions = await getSQSPolicyPermissions({
    queueUrl: subscription.EndpointUrl
  })
  if (policyPermissions) {
    let sendMessagePermission = getSQSTopicPermission({
      policyPermissions,
      topicArn: topicArn
    })
    if (!sendMessagePermission) {
      sendMessagePermission = createSQSTopicPermission({
        topicArn: topicArn,
        sqsArn: sqsArn
      })
      policyPermissions.Statement = policyPermissions.Statement || []
      policyPermissions.Statement.push(sendMessagePermission)
      await setSQSPermissions({
        queueUrl: subscription.EndpointUrl,
        policyPermissions: policyPermissions
      })
    }
  } else {
    const sendMessagePermission = createSQSTopicPermission({
      topicArn: topicArn,
      sqsArn: sqsArn
    })
    await createSQSPermissions({
      queueUrl: subscription.EndpointUrl,
      sqsArn: sqsArn,
      sendMessagePermission: sendMessagePermission
    })
  }
}

module.exports = {
  init,
  createOrGetSNSTopicByName,
  subscribeSQSOnSNSTopic,
  getSQSQueueUrl,
  getSQSSubscription,
  getSQSPolicyPermissions,
  createSQSPermissions,
  setSQSPermissions,
  getSQSTopicPermission,
  createSQSTopicPermission,
  configureSQSSubscriptionWithPermissions
}
