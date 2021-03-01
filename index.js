const express = require('express');
const path = require('path');
const passport = require('passport');
const GitHubStrategy = require('passport-github2');
const createError = require('http-errors');
const expressSession = require('express-session');
const SessionFileStore = require('session-file-store')(expressSession);
const cookieParser = require('cookie-parser');
const cors = require('cors');
const logger = require('morgan');
const Routes = require('./app/routes');

const app = express();

app.set('env', process.env.NODE_ENV || 'development');
if (process.env.TRUST_PROXY) {
  app.set('trust proxy', process.env.TRUST_PROXY === 'true' ? true : process.env.TRUST_PROXY);
}

const ensureLoggedIn = (req, res, next) => {
  if (req.user) {
    return next();
  }
  req.session.returnUrl = req.originalUrl;
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
    scope: ['public_repo'],
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

app.use(function (req, res, next) {
  res.locals.env = app.get('env');
  next();
});

app.use(cors());
if (app.get('env') === 'development') {
  app.use(logger('dev'));
} else {
  app.use(logger('combined'));
}
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
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

app.get('/api/repos', ensureLoggedIn, Routes.getRepos);
app.get('/api/repos/:owner/:repository/labels', ensureLoggedIn, Routes.getLabels);
app.post('/api/repos/:owner/:repository/labels', ensureLoggedIn, Routes.updateLabels);
app.get('/gavin', ensureLoggedIn, Routes.updateLabels);

app.get('/', ensureLoggedIn, (req, res) => {
  console.log('root');
  res.sendFile(path.resolve(__dirname, 'public', 'index.html'));
});

app.use(express.static(path.join(__dirname, 'public')));
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
  res.json(res.locals);
});

module.exports = app;
