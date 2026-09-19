const Notification = require('../models/Notification');

/**
 * Mock notification sender: persists the message and logs it instead of
 * calling a real email/SMS provider. Swap the console.log/save here for a
 * real provider call later without touching callers.
 */
async function sendNotification({ recipientModel, recipientRef, channel, messageBody, relatedEntityType, relatedEntityId }) {
  const notification = await Notification.create({
    recipientModel,
    recipientRef,
    channel,
    messageBody,
    relatedEntityType,
    relatedEntityId,
  });

  console.log(`[notification:${channel}] -> ${recipientModel}:${recipientRef}: ${messageBody}`);

  return notification;
}

module.exports = { sendNotification };
