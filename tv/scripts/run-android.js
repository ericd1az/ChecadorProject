const { existsSync } = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const env = { ...process.env, EXPO_TV: '1' };
const localSdk = env.LOCALAPPDATA && path.join(env.LOCALAPPDATA, 'Android', 'Sdk');
const studioJbr = path.join(env.ProgramFiles || 'C:\\Program Files', 'Android', 'Android Studio', 'jbr');

if (!env.ANDROID_HOME && localSdk && existsSync(localSdk)) env.ANDROID_HOME = localSdk;
if (!env.JAVA_HOME && existsSync(path.join(studioJbr, 'bin', 'java.exe'))) env.JAVA_HOME = studioJbr;

const nativeAccess = '--enable-native-access=ALL-UNNAMED';
if (!env.JAVA_TOOL_OPTIONS?.includes(nativeAccess)) {
  env.JAVA_TOOL_OPTIONS = [env.JAVA_TOOL_OPTIONS, nativeAccess].filter(Boolean).join(' ');
}
const ipv4First = '--dns-result-order=ipv4first';
if (!env.NODE_OPTIONS?.includes(ipv4First)) {
  env.NODE_OPTIONS = [env.NODE_OPTIONS, ipv4First].filter(Boolean).join(' ');
}

const result = spawnSync(process.execPath, [require.resolve('expo/bin/cli'), 'run:android', ...process.argv.slice(2)], {
  cwd: process.cwd(),
  env,
  stdio: 'inherit',
});
if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}
process.exit(result.status ?? 1);
