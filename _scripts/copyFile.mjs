#!/usr/bin/env zx

const files = await fs.readdir('assets');

await Promise.all(files.map(file => {
  return fs.copy(path.resolve(`./assets/${file}`), path.resolve(`./public/${file}`));
}));

console.log(chalk.blue('assets directory copied to public directory!'));
