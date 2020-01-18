const cp = require("child_process");
const path = require("path");
const util = require('util');
const { AutoLanguageClient } = require("atom-languageclient");
const AutocompleteAdapter = require("atom-languageclient/build/lib/adapters/autocomplete-adapter");
const autocomplete_adapter_1 = require("atom-languageclient/build/lib/adapters/autocomplete-adapter");
const {
  getServerInfo,
  installServerIfRequired,
  detectVirtualEnv,
  detectPipEnv,
  replacePipEnvPathVar,
  sanitizeConfig
} = require("./utils");

// Ref: https://github.com/nteract/hydrogen/blob/master/lib/autocomplete-provider.js#L33
// adapted from http://stackoverflow.com/q/5474008
const PYTHON_REGEX = /(([^\d\W]|[\u00A0-\uFFFF])[\w.\u00A0-\uFFFF]*)|\.$/;

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
    provide.excludeLowerPriority = true;
    return provide
  }

  async startServerProcess(projectPath) {
    const config = { 'darwin': 'mac', 'linux': 'linux' }[process.platform]
    if (config == null) {
      throw Error(`${this.getServerName()} not supported on ${process.platform}`)
    }

    const serverPath = path.join(__dirname, '../bin/PySearchServer');
    const venvPath =
      (await detectPipEnv(projectPath)) ||
      (await detectVirtualEnv(projectPath));

    const pylsEnvironment = Object.assign({}, process.env);
    if (venvPath) {
      pylsEnvironment["VIRTUAL_ENV"] = venvPath;
    }
    const python = replacePipEnvPathVar(
      atom.config.get(util.format("%s.python", this.getRootConfigurationKey())),
      venvPath
    );
    const serverName = this.getServerName()
    const childProcess = cp.spawn(python, [serverPath, '-p', python], {
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
      if (code !== 0 && signal == null) {
        atom.notifications.addError("Unable to start the server.", { dismissable: true });
      }
    });
    return childProcess;
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
    if (!PYTHON_REGEX.test(request.prefix)) return null;
    console.info('Received request...');

    const line = request.editor.lineTextForBufferRow(request.editor.getCursorBufferPosition().row);
    if (line.includes('!!')) {  // TODO make the delim configurable
      // eliminates super class call to getSuggestions (in auto-languageclient.js)
      return __awaiter(this, void 0, void 0, function* () {
          const server = yield this._serverManager.getServer(request.editor);
          if (server == null || !autocomplete_adapter_1.default.canAdapt(server.capabilities)) {
              return [];
          }
          this.autoComplete = this.autoComplete || new autocomplete_adapter_1.default();
          this._lastAutocompleteRequest = request;
          return this.adapterSuggestions(server, request, this.onDidConvertAutocomplete);
      });

    } else { return null };
  }

  deactivate() {
    this.serverManager.terminate();
    return Promise.race([super.deactivate(), this.createTimeoutPromise(2000)]);
  }

  createTimeoutPromise(milliseconds) {
    return new Promise((resolve, reject) => {
      let timeout = setTimeout(() => {
        clearTimeout(timeout);
        this.logger.error(
          `Server failed to shutdown in ${milliseconds}ms, forcing termination`
        );
        resolve();
      }, milliseconds);
    });
  }
}

module.exports = new PythonLanguageClient();
exports.default = AutoLanguageClient;
