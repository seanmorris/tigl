module.exports = {  
  sourceMaps: 'inline'
  , watcher: { awaitWriteFinish: true }
  , paths:   { public: './docs' }

  , modules: {
  }
  
  , files:   {
    stylesheets: {joinTo: 'app.css'}
    , javascripts: {joinTo: 'app.js'}
  }
  
  , plugins: {
    preval:  { tokens: { BUILD_TIME: ()=> Date.now() } }
    , raw: {
      pattern: /\.(html|svg|frag|vert)$/,
      wrapper: content => `module.exports = ${JSON.stringify(content)}`
    }
    , babel: {
      plugins:   ["@babel/plugin-proposal-class-properties", "macros"]
      , presets: ['@babel/preset-env']
    }
  }
};
