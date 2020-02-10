const axios = require('axios')
axios.defaults.adapter = require('axios/lib/adapters/http')
const cp = require('child_process')
const fs = require('fs')
const os = require('os')
const path = require('path')
const util = require('util')
const { Directory } = require('atom')

const VIRTUAL_ENV_BIN_DIRS = ['bin', 'Scripts']
const VIRTUAL_ENV_EXECUTABLES = ['python', 'python.exe']

function detectPipEnv (path) {
  return new Promise(resolve => {
    const pipEnvProcess = cp.spawn('pipenv', ['--venv'], {
      cwd: path
    })
    pipEnvProcess.stdout.on('data', data => {
      resolve(`${data}`.trim())
    })
    pipEnvProcess.stderr.on('data', () => {
      resolve(null)
    })
    pipEnvProcess.on('error', () => {
      resolve(null)
    })
  })
}

async function detectVirtualEnv (path) {
  const entries = await new Promise(resolve =>
    new Directory(path).getEntries((error, entries) => {
      if (error === null) {
        resolve(entries)
      } else {
        resolve(null)
      }
    })
  )
  if (entries) {
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (VIRTUAL_ENV_BIN_DIRS.indexOf(entry.getBaseName()) !== -1) {
          for (const executable of VIRTUAL_ENV_EXECUTABLES) {
            if (await entry.getFile(executable).exists()) {
              return path
            }
          }
        } else {
          for (const dirName of VIRTUAL_ENV_BIN_DIRS) {
            for (const executable of VIRTUAL_ENV_EXECUTABLES) {
              if (
                await entry
                  .getSubdirectory(dirName)
                  .getFile(executable)
                  .exists()
              ) {
                return entry.getPath()
              }
            }
          }
        }
      }
    }
  }
}

function sanitizeConfig (config) {
  Object.entries(config).forEach(([key, value]) => {
    if (value === 'null') {
      config[key] = null
    }
  })
  return config
}

function replacePipEnvPathVar (pythonPath, pipEnvPath) {
  if (pythonPath.indexOf('$PIPENV_PATH') !== -1 && pipEnvPath) {
    return pythonPath.replace('$PIPENV_PATH', pipEnvPath)
  }
  return pythonPath
}

function getVersionFrom (data) {
  const match = data.match(/(version) (\d+.\d+.\d+)/)
  return match != null && match.length > 0 ? match[match.length - 1] : null
}

function getSizeFrom (data) {
  const match = data.match(/size (\d+)/)
  return match != null && match.length > 0 ? Number(match[1]) : null
}

function getVersionFromOutput (output) {
  const match = output.match(/(\d+(.\d+)?)(.\d+)?(_\d+)?(?:-\w+)?/)
  return match != null && match.length > 0 ? match[0] : null
}

async function downloadServer (serverPath, serverName, version, triple, callback) {
  console.log(util.format('Downloading %s binary...', serverName))

  const serverDir = path.join(__dirname, '../bin')
  if (!fs.existsSync(serverDir)){
      fs.mkdirSync(serverDir);
  }

  const url = util.format(
    'https://%s.s3-us-west-2.amazonaws.com/bin/%s/%s/%s',
    serverName,
    version.replace(/\./g, '_'),
    triple,
    serverName
  )
  const writer = fs.createWriteStream(serverPath)
  const response = await axios({
    url,
    method: 'GET',
    responseType: 'stream',
    responseEncoding: null
  })
  response.data.pipe(writer)
  fs.chmodSync(serverPath, 755)

  writer.on('finish', () => {
    console.log('Server download successful!')
    atom.notifications.addSuccess('Server download successful!')
    callback()
  })
  writer.on('error', () => {
    console.log('Unable to download binary')
    atom.notifications.addError(utils.format('Unable to download %s binary'), serverName)
  })
}

function getInstalledServerVersion (serverPath, serverName) {
  return new Promise((resolve, reject) => {
    const childProcess = cp.spawn(serverPath, ['--version'])
    childProcess.on('error', err => {
      reject(err)
    })

    let stdOut = ''
    childProcess.stdout.on('data', chunk => stdOut += chunk.toString())
    childProcess.on('close', exitCode => {
      if (exitCode !== 0) {
        reject(new Error('Server version check exited with nonzero exit code'))
      } else if (exitCode === 0) {
        if (stdOut.length > 0) {
          const version = getVersionFromOutput(stdOut)
          if (version == null) {
            reject(new Error('Bad version number'))
          }
          resolve(version)
        }
        reject(new Error('Failed to read server output on version check'))
      }
    })
  })
}

function getSysInfo () {
  const platform = (() => {
    switch (os.platform()) {
      case 'darwin':
        return 'apple-darwin'
      case 'linux':
        return 'unknown-linux-gnu'
      case 'win32':
        return 'pc-windows-gnu'
      default:
        return 'unsupported'
    }
  })()

  const architecture = (() => {
    switch (os.arch()) {
      case 'x64':
        return 'x86_64'
      default:
        return 'unsupported'
    }
  })()

  const triple = util.format('%s-%s', architecture, platform)
  if (triple.includes('unsupported')) {
    atom.notifications.addError(util.format('Platform not supported (%s)', triple))
    throw Error(util.format('Platform not supported (%s)', triple))
  }

  return triple
}

async function getServerInfo (serverPath, serverName) {
  const triple = getSysInfo()
  const url = util.format(
    'https://%s.s3-us-west-2.amazonaws.com/info/%s/latest',
    serverName,
    triple
  )
  const response = await axios({
    url,
    method: 'GET',
    responseType: 'text'
  })
  const body = await response.data
  const serverIsInstalled = fs.existsSync(serverPath)
  const installedServerSize = serverIsInstalled ? fs.statSync(serverPath).size : 0
  const installedServerVersion = serverIsInstalled ? await getInstalledServerVersion(serverPath, serverName).catch((err) => { console.log(err); 0 }) : 0

  return {
    triple: triple,
    latestSize: getSizeFrom(body),
    latestVersion: getVersionFrom(body),
    installedServerVersion: installedServerVersion,
    installedServerSize: installedServerSize
  }
}

function installServerIfRequired (serverPath, serverInfo, serverName) {
  return new Promise(async (resolve, reject) => {
    if (
      serverInfo &&
      serverInfo.latestSize === serverInfo.installedServerSize &&
      serverInfo.latestVersion === serverInfo.installedServerVersion
    ) {
      resolve()
    } else {
      if (fs.existsSync(serverPath)) { fs.unlinkSync(serverPath) }
      await downloadServer(serverPath, serverName, serverInfo.latestVersion, serverInfo.triple, resolve)
        .catch((err) => {
          atom.notifications.addError(
            util.format('Unable to download %s server', serverName)
          )
          console.error(err)
        })
    }
  })
}

exports.getServerInfo = getServerInfo
exports.installServerIfRequired = installServerIfRequired
exports.detectVirtualEnv = detectVirtualEnv
exports.sanitizeConfig = sanitizeConfig
exports.detectPipEnv = detectPipEnv
exports.replacePipEnvPathVar = replacePipEnvPathVar
