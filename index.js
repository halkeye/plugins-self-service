const express = require('express');
const path = require('path');
const passport = require('passport');
const GitHubStrategy = require('passport-github2');
const createError = require('http-errors');
const expressSession = require('express-session');
const SessionFileStore = require('session-file-store')(expressSession);
const cookieParser = require('cookie-parser');
const logger = require('morgan');

const app = express();

const port = process.env.PORT || 5000;
app.set('env', process.env.NODE_ENV || 'development');

const ensureLoggedIn = (req, res, next) => {
  if (req.user) {
    return next();
  }
  req.session.returnUrl = encodeURIComponent(req.originalUrl);
  res.redirect('/login');
};
passport.serializeUser((user, done) => {
  done(null, JSON.stringify(user));
});

passport.deserializeUser((id, done) => {
  try {
    done(null, JSON.parse(id));
  } catch (e) {
    done(e, null);
  }
});
passport.use(new GitHubStrategy(
  {
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: '/auth/github/callback'
  },
  (accessToken, refreshToken, profile, done) => {
    done(null, {
      accessToken,
      refreshToken,
      profile: {
        id: profile.id,
        displayName: profile.displayName,
        username: profile.username
      }
    });
  }
));

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(expressSession({
  store: new SessionFileStore({}),
  resave: false,
  saveUninitialized: false,
  secret: 'FIXME-SUPER-SECRET-SESSION-KEY'
}));
app.use(passport.initialize());
app.use(passport.session());

app.get('/login', passport.authenticate('github', { failureRedirect: '/' }));
app.get('/logout', (req, res) => {
  req.session = null;
  req.logout();
  res.redirect('/');
});

app.get('/auth/github/error', (req, res) => {
  throw Error('FIXME - do something');
});
app.get('/auth/github/callback', passport.authenticate('github', { failureRedirect: '/auth/github/error' }), (req, res) => {
  if (req.session.returnUrl) {
    const returnUrl = req.session.returnUrl;
    req.session.returnUrl = null;
    res.redirect(returnUrl);
  } else {
    res.redirect('/');
  }
});

if (app.get('env') === 'development') {
  const webpack = require('webpack');
  const webpackDevMiddleware = require('webpack-dev-middleware');

  const config = require('./webpack.config.js');
  const compiler = webpack(config);

  // Tell express to use the webpack-dev-middleware and use the webpack.config.js
  // configuration file as a base.
  app.use(
    webpackDevMiddleware(compiler, {
      publicPath: config.output.publicPath
    })
  );
}

app.get('/api/repos', ensureLoggedIn, (req, res) => {
  console.log('req.user', req.user);
  res.json({ repos: [] });
});

app.get('*', ensureLoggedIn, (req, res) => {
  console.log('root');
  res.sendFile(path.resolve(__dirname, 'public', 'index.html'));
});

// catch 404 and forward to error handler
app.use((req, res, next) => {
  next(createError(404));
});

// error handler
app.use((err, req, res, next) => {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

app.listen(port, () => {
  console.log(`Server is up at port ${port}`);
});

module.exports = app;
