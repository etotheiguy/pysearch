const cp = require("child_process");
const path = require("path");
const util = require('util');
const { AutoLanguageClient } = require("atom-languageclient");
const AutocompleteAdapter = require("atom-languageclient/build/lib/adapters/autocomplete-adapter");
const autocomplete_adapter_1 = require("atom-languageclient/build/lib/adapters/autocomplete-adapter");
const {
  checkPylsInstallation,
  detectPipEnv,
  detectVirtualEnv,
  getServerInfo,
  installServerIfRequired,
  replacePipEnvPathVar,
  sanitizeConfig,
} = require("./utils");

var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};

class PythonLanguageClient extends AutoLanguageClient {
  getGrammarScopes() {
    return ["source.python", "python"];
  }

  getLanguageName() {
    return "Python";
  }

  getServerName() {
    return "pysearch";
  }

  getRootConfigurationKey() {
    return "pysearch";
  }

  mapConfigurationObject(configuration) {
    return {
        pyls: {
            plugins: configuration.pylsPlugins
        }
    };
  }

  provideAutocomplete() {
    const provide = super.provideAutocomplete()
    provide.inclusionPriority = 3;
    return provide
  }

  async startServerProcess(projectPath) {
    const config = { 'win32': 'win', 'darwin': 'mac', 'linux': 'linux' }[process.platform]
    if (config == null) {
      atom.notifications.addError(util.format("%s not supported on ", this.getServerName(), process.platform))
      throw Error(util.format("%s not supported on ", this.getServerName(), process.platform))
    }

    const serverPath = path.join(__dirname,  util.format('../bin/%s', this.getServerName()));
    const venvPath =
      (await detectPipEnv(projectPath)) ||
      (await detectVirtualEnv(projectPath));

    const pylsEnvironment = Object.assign({}, process.env);
    if (venvPath) {
      pylsEnvironment["VIRTUAL_ENV"] = venvPath;
    }
pylsEnvironment.RUST_BACKTRACE=1
pylsEnvironment.RUST_LOG="debug"
    const python = replacePipEnvPathVar(
      atom.config.get(util.format("%s.python", this.getRootConfigurationKey())),
      venvPath
    );
    const token = atom.config.get(`${this.getRootConfigurationKey()}.access_token`);
    const serverName = this.getServerName()
    return getServerInfo(serverPath, serverName)
      .then(serverInfo => installServerIfRequired(serverPath, serverInfo, serverName))
      .then(() => checkPylsInstallation(serverPath, python))
      .then(() => {
        var serverArgs = ['-p', python];
        if (token !== "None") {
          serverArgs.push('-t', token);
        }
        const childProcess = cp.spawn(serverPath,
          serverArgs,
          {
            cwd: projectPath,
            env: pylsEnvironment
          });
        childProcess.on("error", err => {
          const description =
            err.code == "ENOENT"
              ? `Server not found at found at \`${serverPath}\`.`
              : `Could not spawn the server \`${serverPath}\`.`;
          atom.notifications.addError(
            util.format("`%s` could not launch.", serverName), { dismissable: true });
        });

        childProcess.on("close", (code, signal) => {
          switch (code) {
            case 0: {
              return;
            }
            case 2: {
              atom.notifications.addError("Unable to start a python language server.\n\
                  Install by running\n\n```pip install python-language-server[all]```",
                { dismissable: true });
              return;
            }
            case 9:
            case 10:
            case 11: {
              const err = "Invalid PySearch access token."
              console.error(`${err} (error code: ${code})`)
              atom.notifications.addError(err, {dismissable: true});
              return;
            }
            default: {
              atom.notifications.addError(`PySearch failed with unknown error code ${code}\n Please report this error to founders@getflowbot.com`, {dismissable: true});
              return;
            }
          }
        });
        return childProcess;
      });
  }

  // from autocomplete adapter getSuggestions() function 
  adapterSuggestions(server, request, onDidConvertCompletionItem) {
        return __awaiter(this, void 0, void 0, function* () {
            const triggerChars = server.capabilities.completionProvider != null
                ? server.capabilities.completionProvider.triggerCharacters || []
                : [];
            // triggerOnly is true if we have just typed in the trigger character, and is false if we
            // have typed additional characters following the trigger character.
            const [triggerChar, triggerOnly] = autocomplete_adapter_1.default.getTriggerCharacter(request, triggerChars);
            // Get the suggestions either from the cache or by calling the language server
            const suggestions = yield this.autoComplete.getOrBuildSuggestions(server, request, triggerChar, triggerOnly, onDidConvertCompletionItem);
            return suggestions
        });
  }

  async getSuggestions(request) {
      return __awaiter(this, void 0, void 0, function* () {
          const server = yield this._serverManager.getServer(request.editor);
          if (server == null || !autocomplete_adapter_1.default.canAdapt(server.capabilities)) {
              return [];
          }
          this.autoComplete = this.autoComplete || new autocomplete_adapter_1.default();
          this._lastAutocompleteRequest = request;
          return this.adapterSuggestions(server, request, this.onDidConvertAutocomplete);
      });
  }
}

module.exports = new PythonLanguageClient();
exports.default = AutoLanguageClient;
