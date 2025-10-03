const buildCommands = (files, base, { lintExtensions = [] } = {}) => {
  const relativeFiles = files
    .filter((file) => file.startsWith(`${base}/`))
    .map((file) => file.replace(`${base}/`, ''));

  if (relativeFiles.length === 0) {
    return [];
  }

  const prettierTargets = relativeFiles.map((file) => `'${file}'`).join(' ');
  const lintTargets = relativeFiles
    .filter((file) => lintExtensions.some((ext) => file.endsWith(ext)))
    .map((file) => `'${file}'`)
    .join(' ');

  const commands = [`cd ${base} && npx prettier --write ${prettierTargets}`];

  if (lintTargets) {
    commands.push(`cd ${base} && npx eslint --max-warnings=0 ${lintTargets}`);
  }

  return commands;
};

module.exports = {
  'api/**/*.{ts,tsx,js,json}': (files) => buildCommands(files, 'api', { lintExtensions: ['.ts', '.tsx', '.js'] }),
  'web/**/*.{ts,tsx,js,jsx,json,css}': (files) => buildCommands(files, 'web', {
    lintExtensions: ['.ts', '.tsx', '.js', '.jsx']
  })
};
