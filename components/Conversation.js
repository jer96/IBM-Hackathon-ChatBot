// internal module to allow setup of WCS
const ConversationV1 = require('watson-developer-cloud/conversation/v1');

// can set up any instance based on workspace id
// set up Conversation service wrapper.
function createConversationInstance (workspaceId, appEnv) {
  const username = appEnv.services['conversation'][0].credentials.username;
  const password = appEnv.services['conversation'][0].credentials.password;
  return new ConversationV1({
    username : username, // replace with username from service key
    password : password,
    path: { workspace_id: workspaceId }, // replace with workspace ID
    version_date: '2016-07-11'
  });
}

module.exports = {
  createConversationInstance : createConversationInstance
};
