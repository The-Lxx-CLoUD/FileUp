module.exports = {
  appId: 'cloud.lxx.fileup',
  productName: 'FileUp',
  copyright: 'Copyright © 2026 TheLxxCLoUD',
  asar: true,
  compression: 'normal',
  npmRebuild: false,
  directories: {
    output: 'release',
    buildResources: 'build'
  },
  files: [
    'main/**',
    'dist/renderer/**',
    '!docs/**',
    '!scripts/**',
    '!src/**',
    '!release/**'
  ],
  win: {
    target: [{ target: 'nsis', arch: ['x64'] }],
    icon: 'build/icon.ico',
    
    signExecutable: false
  },
  nsis: {
    oneClick: false,
    perMachine: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: 'FileUp',
    
    script: 'build/nsis/installer.nsi',
    warningsAsErrors: false,
    deleteAppDataOnUninstall: false,
    artifactName: 'FileUp-${version}-Setup-${arch}.${ext}'
  },
  linux: {
    target: ['deb', 'AppImage'],
    category: 'Utility',
    maintainer: 'TheLxxCLoUD',
    vendor: 'TheLxxCLoUD',
    icon: 'build/',
    synopsis: 'Fast, modern file manager',
    description: 'FileUp — a fast, modern, cross-platform file manager. Developed by TheLxxCLoUD.',
    artifactName: 'FileUp-${version}-${arch}.${ext}'
  },
  deb: {
    priority: 'optional',
    afterInstall: 'build/deb-after-install.sh'
  },
  appImage: {
    license: 'build/license.txt',
    artifactName: 'FileUp-${version}-${arch}.AppImage'
  }
};
