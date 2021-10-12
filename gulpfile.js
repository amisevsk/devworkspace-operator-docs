// 
// Copyright(c) 2021 Red Hat, Inc.
// This program and the accompanying materials are made
// available under the terms of the Eclipse Public License 2.0
// which is available at https://www.eclipse.org/legal/epl-2.0/
// 
//  SPDX - License - Identifier: EPL - 2.0
// 
'use strict'

const connect = require('gulp-connect')
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const fs = require('fs')
const generator = require('@antora/site-generator-default')
const { reload: livereload } = process.env.LIVERELOAD === 'true' ? require('gulp-connect') : {}
const { parallel, series, src, watch } = require('gulp')
const yaml = require('js-yaml')

const playbookFilename = 'antora-playbook-for-development.yml'
const playbook = yaml.safeLoad(fs.readFileSync(playbookFilename, 'utf8'))
const outputDir = (playbook.output || {}).dir || './build/site'
const watchBuild = outputDir + '/**'
const serverConfig = {
    host: '0.0.0.0',
    livereload: true,
    name: playbook.site.title,
    port: 4000,
    root: outputDir
}
const antoraArgs = ['--playbook', playbookFilename]
const watchPatterns = playbook.content.sources.filter((source) => !source.url.includes(':')).reduce((accum, source) => {
    accum.push(`./*.yml`)
    accum.push(`./modules/**/*`)
    return accum
}, [])

function generate(done) {
    generator(antoraArgs, process.env)
        .then(() => done())
        .catch((err) => {
            console.log(err)
            done()
        })
}

async function serve(done) {
    connect.server(serverConfig, function () {
        this.server.on('close', done)
        watch(watchPatterns, series(generate, testhtml))
        if (livereload) watch(this.root).on('change', (filepath) => src(filepath, { read: false }).pipe(livereload()))
    })
}


async function testhtml() {
    // Report links errors but don't make gulp fail.
    try {
        const { stdout, stderr } = await exec('htmltest')
        console.log(stdout);
        console.error(stderr);
    }
    catch (error) {
        console.log(error.stdout);
        console.log(error.stderr);
        return;
    }
}


exports.default = series(
    generate,
    serve,
    parallel(testhtml)
);
