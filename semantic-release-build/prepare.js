const path = require('path')
const fs = require('fs')
const SemanticReleaseError = require('@semantic-release/error')
const archiver = require('archiver')

const packZip = (source, destination) =>
  new Promise((resolve, reject) => {
    const archive = archiver('zip', { zlib: { level: 9 } })
    const output = fs.createWriteStream(destination)
    output.on('close', resolve)
    output.on('error', reject)
    archive.on('error', reject)
    archive.pipe(output)
    archive.directory(source, false)
    archive.finalize()
  })

const prepare = async (pluginConfig = {}, context) => {
  let { dist = 'dist', name = 'extension' } = pluginConfig

  dist = path.resolve(dist)
  if (!fs.existsSync(dist)) throw new SemanticReleaseError('dist 目录不存在')

  const manifestPath = path.join(dist, 'manifest.json')
  if (!fs.existsSync(manifestPath))
    throw new SemanticReleaseError('manifest.json 文件不存在')

  const { logger, nextRelease } = context

  // 修改版本号
  const version = nextRelease.version
  try {
    logger.log('修改 manifest.json 版本号')
    const manifestData = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))
    fs.writeFileSync(
      manifestPath,
      JSON.stringify({ ...manifestData, version }, null, 2),
      'utf-8'
    )

    logger.log('修改 package.json 版本号')
    const packagePath = path.resolve('package.json')
    const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf-8'))
    fs.writeFileSync(
      packagePath,
      JSON.stringify({ ...packageData, version }, null, 2),
      'utf-8'
    )
  } catch (error) {
    throw new SemanticReleaseError('修改版本失败')
  }

  // 打包成 zip
  logger.log('打包 zip')
  await packZip(dist, path.resolve(`${name}.zip`))
}

module.exports = prepare
