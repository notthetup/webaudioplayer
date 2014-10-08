'use strict';

var pkg = require('./package.json');

var gulp = require('gulp');
var bump = require('gulp-bump');
var uglify = require('gulp-uglify');
var prettify = require('gulp-jsbeautifier');
var rename = require('gulp-rename');
var jshint = require('gulp-jshint');
var header = require('gulp-header');
var webserver = require('gulp-webserver');

var banner= '/*! <%= pkg.name %> - v<%= pkg.version %> - <%= new Date() %> */ \n';

var paths = {
	files: {
		src : 'src/*.js',
		testsrc : 'test/*.js',
		meta : '*.js'
	},
	dirs: {
		base : '/',
		dist : 'dist/',
		src : 'src/',
		test : 'test/'
	}
};

gulp.task('jshint', function(){
	return gulp.src([paths.files.src, 'package.json', 'bower.json', 'Gulpfile.js'])
	.pipe(jshint('.jshintrc'))
	.pipe(jshint.reporter('jshint-stylish'))
	.pipe(jshint.reporter('fail'));
});

gulp.task('jsbeautify:src', function(){
	return gulp.src([paths.files.src])
	.pipe(prettify({config: '.jsbeautifyrc', mode: 'VERIFY_AND_WRITE'}))
	.pipe(gulp.dest(paths.dirs.src));
});

gulp.task('jsbeautify', ['jsbeautify:src']);

gulp.task('jsbeautify:meta', function(){
	return gulp.src([paths.files.meta])
	.pipe(prettify({config: '.jsbeautifyrc', mode: 'VERIFY_AND_WRITE'}))
	.pipe(gulp.dest(paths.dirs.base));
});

gulp.task('bump', function(){
	return gulp.src('./package.json')
	.pipe(bump())
	.pipe(gulp.dest('./'));
});

gulp.task('bump:pre', function(){
	return gulp.src('./package.json')
	.pipe(bump({type: 'prerelease'}))
	.pipe(gulp.dest('./'));
});

gulp.task('bump:min', function(){
	return gulp.src('./package.json')
	.pipe(bump({type: 'prerelease'}))
	.pipe(gulp.dest('./'));
});

gulp.task('bump:min', function(){
	return gulp.src('./package.json')
	.pipe(bump({type: 'major'}))
	.pipe(gulp.dest('./'));
});

gulp.task('watch', function(){
	gulp.watch([paths.files.testsrc, paths.files.src], ['jshint', 'jsbeautify']);
});

gulp.task('test', ['jsbeautify', 'jshint', 'watch'], function(){
    return gulp.src([paths.dirs.test, paths.dirs.src])
    .pipe(webserver({
        port: 8000,
        host : "localhost"
    }));
});

gulp.task('release', ['jsbeautify', 'jshint'], function(){
	return gulp.src(paths.files.src)
	.pipe(header(banner, {pkg: pkg}))
	.pipe(gulp.dest(paths.dirs.dist))
	.pipe(uglify({
		preserveComments : "some"
	}))
	.pipe(rename(function (path) {
        path.extname = ".min.js";
    	}))
	.pipe(gulp.dest(paths.dirs.dist));
});
