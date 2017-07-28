// translator module to allow to interact directly with Watson translation
var LanguageTranslatorV2 = require('watson-developer-cloud/language-translator/v2');

function createTranslationService (appEnv) {
  const username = appEnv.services['language_translator'][0].credentials.username;
  const password = appEnv.services['language_translator'][0].credentials.password;
  return new LanguageTranslatorV2({
    username: username,
    password: password,
    url: 'https://gateway.watsonplatform.net/language-translator/api/'
  });
}

module.exports = {
  createTranslationService : createTranslationService
};