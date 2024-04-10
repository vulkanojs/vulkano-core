<p align="center">
  <img src="https://avatars.githubusercontent.com/u/42077334?s=200&v=4" alt="Nodemon Logo">
</p>

# Vulkano

Vulkano is a small, simple, and fast framework for creating web applications using NodeJS. Inspired by KumbiaPHP.

[![Backers on Open Collective](https://opencollective.com/vulkanojs/backers/badge.svg)](#backers)
[![Sponsors on Open Collective](https://opencollective.com/vulkanojs/sponsors/badge.svg)](#sponsors)

## Backers

Thank you to all [our backers](https://opencollective.com/vulkanojs#backer)! 🙏

[![vulkano backers](https://opencollective.com/vulkanojs/tiers/backer.svg?avatarHeight=50)](https://opencollective.com/vulkanojs#backers)


## Buy me a coffe

[Buy me a coffe](https://buymeacoffee.com/argordmel) 🙏

## Install

### System

- Unix
- Node.js v20+

### Packages

```bash
$ npm install @vulkano/core
```

## Your App Structure

- `public/` - HTTP Public folder
- `vulkano/` - Vulkano App (config, controllers, models, views)
- `app.js` - Server entry point

## Your Server entry point

```bash
/**
 * app.js
 *
 * To start the server, run: ⁠ node app.js ⁠.
 *
 * For example:
 *   => ⁠ npm run start ⁠
 *   => ⁠ node app.js ⁠
 */

const vulkano = require('@vulkano/core');

vulkano(); ⁠
```


## Your Vulkano App Folder

- `vulkano/` - Vulkano App
  - `config` - Your config files
    - `env` - Folder for custom environment settings
    - `express` - Folder to customize the server (cookies, jwt, helmet, cors and settings)
    - `locales` - i18n folder
    - `views` - Folder to customize filters and helpers to Nunjukcs
  - `controllers` - Your controllers
  - `models` - Your models
  - `services` - Your services or libs

## Your Vulkano Public Folder

- `public/` - Public Path
  - `css` - Styles
  - `fonts` - Fonts
  - `img` - Images
  - `js` - Javascript
  - `files` - Files uploaded
