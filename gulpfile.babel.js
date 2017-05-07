'use strict'

import plugins   from 'gulp-load-plugins';
import yargs     from 'yargs';
import browser   from 'browser-sync';
import gulp      from 'gulp';
import yaml      from 'js-yaml';
import fs        from 'fs';

// Load all Gulp plugins into one variable
const $ = plugins();

// Check for --production flag
const PRODUCTION = !!(yargs.argv.production);

// Load all settings from config.yml
const {PATHS, PORT, PROXY, COMPATIBILITY, UNCSS_OPTIONS} = loadConfig();

function loadConfig() {
  let ymlFile = fs.readFileSync('config.yml', 'utf8');
  return yaml.load(ymlFile);
}

// Build the distribution files by running all of the below tasks
gulp.task('build', gulp.parallel(sass, javascript, specificJS));

// Build the site, run the server, and watch for file changes
gulp.task('default',
gulp.series('build', server, watch));

// Compile Sass into CSS
// In production, the CSS is compressed
function sass() {
  return gulp.src('src/scss/style.scss')
  .pipe($.sourcemaps.init())
  .pipe($.sass({
    includePaths: PATHS.sass
  })
  .on('error', $.sass.logError))
  .pipe($.autoprefixer({
    browsers: COMPATIBILITY
  }))
  // Comment in the pipe below to run UnCSS in production
  .pipe($.if(PRODUCTION, $.uncss(UNCSS_OPTIONS)))
  .pipe($.if(PRODUCTION, $.cssnano()))
  .pipe($.if(!PRODUCTION, $.sourcemaps.write()))
  .pipe(gulp.dest(PATHS.dist + '/assets/css'))
  .pipe(browser.reload({ stream: true }));
}

// Combine JavaScript into one file
// In production, the file is minified
function javascript() {
  return gulp.src(PATHS.javascript)
    .pipe($.sourcemaps.init())
    .pipe($.babel({ignore: ['what-input.js']}))
    .pipe($.concat('app.js'))
    .pipe($.if(PRODUCTION, $.uglify()
      .on('error', e => { console.log(e); })
    ))
    .pipe($.if(!PRODUCTION, $.sourcemaps.write()))
    .pipe(gulp.dest(PATHS.dist + '/assets/js'));
}

function specificJS() {
  return gulp.src(PATHS.specificJS)
    .pipe($.sourcemaps.init())
    .pipe($.babel({ignore: ['what-input.js']}))
    .pipe($.if(PRODUCTION, $.uglify()
      .on('error', e => { console.log(e); })
    ))
    .pipe($.if(!PRODUCTION, $.sourcemaps.write()))
    .pipe(gulp.dest(PATHS.dist + '/assets/js'));
}

// Start a server with BrowserSync to preview the site in
function server(done) {
  browser.init({
    port: PORT, proxy: PROXY
  });
  done();
}

// Watch for changes to static assets, pages, Sass, and JavaScript
function watch() {
  gulp.watch('src/scss/**/*.scss').on('all', sass);
  gulp.watch(PATHS.specificJS).on('all', gulp.series(specificJS, browser.reload));
  gulp.watch('src/js/**/*.js').on('all', gulp.series(javascript, browser.reload));
}
