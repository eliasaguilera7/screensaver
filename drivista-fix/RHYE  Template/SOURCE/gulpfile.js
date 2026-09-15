import gulp from 'gulp';
import autoPrefixer from 'gulp-autoprefixer';
import gulpConcat from 'gulp-concat';
import gulpNoop from 'gulp-noop';
import plumber from 'gulp-plumber';
import dartSass from 'sass';
import gulpSass from 'gulp-sass';
import browserSync from 'browser-sync';
import gulpSourcemaps from 'gulp-sourcemaps';
import gulpTerser from'gulp-terser';
import gulpWrapper from 'gulp-wrapper';
import gulpCleanCss from 'gulp-clean-css';

const { src, dest, series, watch, parallel } = gulp;
const sass = gulpSass(dartSass);
const bsServer = browserSync.create();

/* ======================================================================== */
/* SETUP */
/* ======================================================================== */
const
  compilation = {
    src: '.', // source dir (current)
    dist: '../HTML', // compilation dir
    minify: true
  };

/* ======================================================================== */
/* PATHS TO RESOURCES */
/* ======================================================================== */
const
  path = {
    vendor: {
      styles: [
        compilation.src + '/static/sass/libraries/*.css',
        compilation.src + '/static/sass/libraries/*.sass',
      ],
      scripts: [
        compilation.src + '/static/js/framework/*.js',
        compilation.src + '/static/js/libraries/*.js',
        compilation.src + '/static/js/plugins/*.js'
      ]
    },
    components: {
      styles: [
        compilation.src + '/static/sass/helpers/*.sass',
        compilation.src + '/static/sass/mixins.sass',
        compilation.src + '/static/sass/vars.sass',
        compilation.src + '/static/sass/*.sass',
        compilation.src + '/components/**/*.sass',
      ],
      scripts: [
        compilation.src + '/static/js/common.js',
        compilation.src + '/components/_base/*.js',
        compilation.src + '/components/{**,!_base}/*.js'
      ]
    },
    watch: [
      compilation.dist + '/**/*.*', // watch for all files changes in compilation dir
      '!' + compilation.dist + '/**/*.+(js|css|map)', // don't watch for files that are complied (those are handled by browser-sync)
    ]
  };

/* ======================================================================== */
/* VENDOR RESOURCES */
/* ======================================================================== */
function vendorCSS() {
  return src(path.vendor.styles)
    .pipe(plumber())
    .pipe(sass({
      allowEmpty: true
    }).on('error', sass.logError))
    .pipe(gulpConcat('vendor.css'))
    .pipe(gulpCleanCss())
    .pipe(dest(compilation.dist + '/css'))
    .pipe(bsServer.reload({
      stream: true
    }));
}

function vendorJS() {
  return src(path.vendor.scripts)
    .pipe(plumber())
    .pipe(gulpConcat('vendor.js'))
    .pipe(dest(compilation.dist + '/js'))
    .pipe(bsServer.reload({
      stream: true
    }));
}

/* ======================================================================== */
/* COMPONENTS RESOURCES */
/* ======================================================================== */
function componentsCSS() {
  return src(path.components.styles)
    .pipe(plumber())
    .pipe(compilation.minify ? gulpNoop() : gulpSourcemaps.init())
    .pipe(gulpConcat('main.sass'))
    .pipe(sass({
      allowEmpty: true,
      outputStyle: compilation.minify ? 'compressed' : 'expanded'
    }).on('error', sass.logError))
    .pipe(autoPrefixer())
    .pipe(compilation.minify ? gulpNoop() : gulpSourcemaps.write('/'))
    .pipe(dest(compilation.dist + '/css'))
    .pipe(bsServer.reload({
      stream: true
    }));
}

function componentsJS() {
  return src(path.components.scripts)
    .pipe(plumber())
    .pipe(compilation.minify ? gulpNoop() : gulpSourcemaps.init())
    .pipe(gulpConcat('components.js'))
    .pipe(gulpWrapper({
      header: '(function ($) {\n\n\'use strict\';\n\n',
      footer: '\n\n})(jQuery);\n'
    }))
    .pipe(compilation.minify ? gulpNoop() : gulpSourcemaps.write('/'))
    .pipe(compilation.minify ? gulpTerser() : gulpNoop())
    .pipe(dest(compilation.dist + '/js'))
    .pipe(bsServer.reload({
      stream: true
    }));
}

/* ======================================================================== */
/* BROWSER SYNC */
/* ======================================================================== */
function browserSyncCreate(done) {
  bsServer.init({
    server: compilation.dist,
    cors: true
  });

  done();
}

function browserSyncReload(done) {
  bsServer.reload();
  done();
}

/* ======================================================================== */
/* WATCHER */
/* ======================================================================== */
function watcher() {
  watch(path.vendor.styles, vendorCSS);
  watch(path.vendor.scripts, vendorJS);
  watch(path.components.styles, componentsCSS);
  watch(path.components.scripts, componentsJS);
  watch(path.watch, browserSyncReload);
}

export default series(
  parallel(vendorCSS, vendorJS, componentsCSS, componentsJS),
  browserSyncCreate,
  watcher
);
