import fs from 'node:fs'
import path from 'node:path'

const targets = [
  path.join(
    process.cwd(),
    'node_modules',
    'cordova-plugin-purchase',
    'src',
    'ios',
    'FileUtility.h',
  ),
  path.join(
    process.cwd(),
    'ios',
    'capacitor-cordova-ios-plugins',
    'sources',
    'CordovaPluginPurchase',
    'FileUtility.h',
  ),
]

const patchFile = (target) => {
  if (!fs.existsSync(target)) {
    return
  }
  const source = fs.readFileSync(target, 'utf8')
  let updated = source
  if (!updated.includes('#import <Foundation/Foundation.h>')) {
    updated = `#import <Foundation/Foundation.h>\n\n${updated}`
  }
  updated = updated.replace('#pragma end', '#pragma mark -')
  if (updated !== source) {
    fs.writeFileSync(target, updated, 'utf8')
    console.info(`patch-cordova-purchase-header: updated ${target}`)
  }
}

for (const target of targets) {
  patchFile(target)
}
