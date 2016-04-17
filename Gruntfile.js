module.exports = function(grunt) {
 
  grunt.initConfig({
    jshint: {
      all: ['Gruntfile.js', 'index.js']
    }
    //,
    //nodeunit: {
    //  all: ['test/**/*.js']
    //}
  });
 
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-nodeunit');
  
  grunt.registerTask('test', ['jshint', 'nodeunit']);
  
};
