#!/usr/bin/env node
/* eslint-disable global-require */
/* eslint-disable import/extensions */

const [,, command] = process.argv;

switch (command) {
  case 'init':
    require('./setup.js');
    break;
  default:
    console.log([
      '',
      '  Usage: vulkano <command>',
      '',
      '  Commands:',
      '    init    Scaffold a new Vulkano project in the current directory',
      '',
    ].join('\n'));
    process.exit(0);
}
