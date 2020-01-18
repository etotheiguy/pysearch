const axios = require('axios');
const cp = require("child_process");
const fs = require('fs');
const util = require('util');
const { Directory } = require("atom");

const VIRTUAL_ENV_BIN_DIRS = ["bin", "Scripts"];
const VIRTUAL_ENV_EXECUTABLES = ["python", "python.exe"];

function detectPipEnv(path) {
  return new Promise(resolve => {
    const pipEnvProcess = cp.spawn("pipenv", ["--venv"], {
      cwd: path
    });
    pipEnvProcess.stdout.on("data", data => {
      resolve(`${data}`.trim());
    });
    pipEnvProcess.stderr.on("data", () => {
      resolve(null);
    });
    pipEnvProcess.on("error", () => {
      resolve(null);
    });
  });
}

async function detectVirtualEnv(path) {
  const entries = await new Promise(resolve =>
    new Directory(path).getEntries((error, entries) => {
      if (error === null) {
        resolve(entries);
      } else {
        resolve(null);
      }
    })
  );
  if (entries) {
    for (let entry of entries) {
      if (entry.isDirectory()) {
        if (VIRTUAL_ENV_BIN_DIRS.indexOf(entry.getBaseName()) !== -1) {
          for (let executable of VIRTUAL_ENV_EXECUTABLES) {
            if (await entry.getFile(executable).exists()) {
              return path;
            }
          }
        } else {
          for (let dir_name of VIRTUAL_ENV_BIN_DIRS) {
            for (let executable of VIRTUAL_ENV_EXECUTABLES) {
              if (
                await entry
                  .getSubdirectory(dir_name)
                  .getFile(executable)
                  .exists()
              ) {
                return entry.getPath();
              }
            }
          }
        }
      }
    }
  }
}

function sanitizeConfig(config) {
  Object.entries(config).forEach(([key, value]) => {
    if (value === "null") {
      config[key] = null;
    }
  });
  return config;
}

function replacePipEnvPathVar(pythonPath, pipEnvPath) {
  if (pythonPath.indexOf("$PIPENV_PATH") !== -1 && pipEnvPath) {
    return pythonPath.replace("$PIPENV_PATH", pipEnvPath);
  }
  return pythonPath;
}

function getVersionFrom(data) {
  const match = data.match(/(version) (\d+.\d+.\d+)/)
  return match != null && match.length > 0 ? match[match.length - 1] : null
}

function getSizeFrom(data) {
  const match = data.match(/size (\d+)/)
  return match != null && match.length > 0 ? Number(match[1]) : null
}

function getVersionFromOutput(output) {
  const match = output.match(/(\d+(.\d+)?)(.\d+)?(_\d+)?(?:-\w+)?/)
  return match != null && match.length > 0 ? match[0] : null
}

async function downloadServer(serverPath, serverName, callback) {
  atom.notifications.addInfo('Downloading server binary...')
  const url = util.format('https://%s.s3-us-west-2.amazonaws.com/%s', serverName, serverName);
  const writer = fs.createWriteStream(serverPath)

  const response = await axios({
    url,
    method: 'GET',
    responseType: 'stream',
    responseEncoding: null
  })

  response.data.pipe(writer)
  fs.chmodSync(serverPath, 0755);

  writer.on('finish', () => { atom.notifications.addSuccess('Server download successful!'), callback() })
  writer.on('error', () => { atom.notifications.addError('Unable to download binary') })
}

function getInstalledServerVersion(serverPath, serverName) {
  return new Promise((resolve, reject) => {
    const childProcess = cp.spawn(serverPath, [ '--version' ])
    childProcess.on('error', err => {
      atom.notifications.addError(util.format('Could not start %s server', serverName));
      reject();
    });
    let stdErr = '', stdOut = '';
    childProcess.stderr.on('data', chunk => stdErr += chunk.toString());
    childProcess.stdout.on('data', chunk => stdOut += chunk.toString());
    childProcess.on('close', exitCode => {
      const output = stdErr + '\n' + stdOut;
      if (exitCode === 0 && output.length > 2) {
        const version = getVersionFromOutput(output);
        if (version == null) {
          atom.notifications.addError(
          util.format('Could not determine %s version from %s', serverName, version));
          reject();
        }
        resolve(version)
      } else {
        atom.notifications.addError(
          util.format('Could not determine version from %s server binary', serverName), {
            description: stdErr != '' ? `<code>${stdErr}</code>` : `Exit code ${exitCode}`
          });
        reject();
      }
    });
  });
}

async function getServerInfo(serverPath, serverName) {
  if (!fs.existsSync(serverPath)) { return null }
  const url = util.format('https://%s.s3-us-west-2.amazonaws.com/%s.info', serverName, serverName);
  response = await axios({
      url,
      method: 'GET',
      responseType: 'text',
    });
  body = await response.data
  return {
    latestSize: getSizeFrom(body),
    latestVersion: getVersionFrom(body),
    installedServerVersion: await getInstalledServerVersion(serverPath, serverName),
    installedServerSize: fs.statSync(serverPath)["size"]
  }
}

function installServerIfRequired(serverPath, serverInfo, serverName) {
  return new Promise((resolve, reject) => {
    try {
      if (
        serverInfo &&
        serverInfo.latestSize === serverInfo.installedServerSize &&
        serverInfo.latestVersion === serverInfo.installedServerVersion
      ) {
        resolve();
      } else {
        console.log("Downloading binary...");
        if (fs.existsSync(serverPath)) { fs.unlinkSync(serverPath) }
        downloadServer(serverPath, serverName, resolve)
      }
    } catch(err) {
      console.error(err);
      reject();
    }
  });
}

exports.getServerInfo = getServerInfo;
exports.installServerIfRequired = installServerIfRequired;
exports.detectVirtualEnv = detectVirtualEnv;
exports.sanitizeConfig = sanitizeConfig;
exports.detectPipEnv = detectPipEnv;
exports.replacePipEnvPathVar = replacePipEnvPathVar;
