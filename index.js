const express = require('express');
const fs = require('fs');
const path = require('path');
const passport = require('passport');
const GitHubStrategy = require('passport-github2');
const createError = require('http-errors');
const expressSession = require('express-session');
const SessionFileStore = require('session-file-store')(expressSession);
const cookieParser = require('cookie-parser');
const cors = require('cors');
const logger = require('morgan');
const { graphql } = require('@octokit/graphql');

const app = express();

const GRAPHQL_QUERY_GET_REPOS = fs.readFileSync(path.join(__dirname, 'graphql', 'repos.graphql')).toString();
const GRAPHQL_QUERY_GET_LABELS = fs.readFileSync(path.join(__dirname, 'graphql', 'getLabels.graphql')).toString();
const OFFICIAL_LABELS = Object.freeze([
  {
    name: 'good first issue',
    color: '7057ff'
  },
  {
    name: 'hackathon',
    color: '85f920'
  },
  {
    name: 'help wanted',
    color: 442
  },
  {
    name: 'question',
    color: 'D876E3'
  },
  {
    name: 'wontfix',
    color: 'FFFFFF'
  },
  {
    name: 'duplicate',
    color: 'CFD3D7'
  },
  {
    name: 'bug',
    color: 'D73A4A'
  },
  {
    name: 'documentation',
    color: '0e8a16',
    description: 'A PR that adds to documentation - used by Release Drafter'
  },
  {
    name: 'hacktoberfest',
    color: 'bdff3a',
    description: 'Hacktoberfest. https://jenkins.io/blog/2018/10/01/hacktoberfest/'
  },
  {
    name: 'feature',
    color: '1d00ff',
    description: 'A PR that adds a feature - used by Release Drafter'
  },
  {
    name: 'bugfix',
    oldname: 'fix',
    color: 'c9e85c',
    description: 'A PR that fixes a bug - used by Release Drafter'
  },
  {
    name: 'chore',
    color: 'c9abea',
    description: 'a PR that adds to maintenance - used by Release Drafter'
  },
  {
    name: 'test',
    color: 'd6e819',
    description: 'A PR that adds to testing - used by Release Drafter'
  },
  {
    name: 'pinned',
    color: '5ed5e5',
    description: 'Used to avoid stale[bot] marking a issue/PR stale'
  },
  {
    name: 'plugin-compatibility',
    color: '8425c4'
  },
  {
    name: 'stale',
    color: 'ffffff',
    description: 'Used by stale[bot] to mark a issue/PR stale'
  },
  {
    name: 'skip-changelog',
    color: 'f44271',
    description: 'A PR that is excluded from Release draft - used by Release Drafter'
  },
  {
    name: 'removed',
    color: 'aa0f1c',
    description: 'A PR that removes code - used by Release Drafter'
  },
  {
    name: 'deprecated',
    color: 'e2b626',
    description: 'A PR that deprecates code - used by Release Drafter'
  },
  {
    name: 'breaking',
    color: 640910,
    description: 'A PR that is a breaking change - used by Release Drafter'
  },
  {
    name: 'dependencies',
    color: '0366d6',
    description: 'A PR that updates dependencies - used by Release Drafter'
  }
]);

function reduceToObject (field) {
  return (previousValue, currentValue) => {
    previousValue[currentValue[field]] = {
      // merge them
      ...(previousValue[currentValue[field]] || {}),
      ...currentValue
    };
    return previousValue;
  };
}

const port = process.env.PORT || 5000;
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

const cachedRepositories = {};
app.get('/api/repos', ensureLoggedIn, async (req, res) => {
  if (cachedRepositories[req.user.accessToken]) {
    return res.json(cachedRepositories[req.user.accessToken]);
  }

  const repositories = [];
  let hasNextPage = true;
  let after = null;

  while (hasNextPage) {
    const data = await graphql(GRAPHQL_QUERY_GET_REPOS, {
      cursor: after,
      headers: {
        authorization: `token ${req.user.accessToken}`
      }
    });
    repositories.push(...data.repositoryOwner.repositories.nodes.filter(repo => repo.viewerCanAdminister).map(repo => {
      return {
        owner: repo.owner.login,
        name: repo.name
      };
    }));
    hasNextPage = data.repositoryOwner.repositories.pageInfo.hasNextPage;
    after = data.repositoryOwner.repositories.pageInfo.endCursor;
  }

  const ret = { repos: repositories };
  if (app.get('env') === 'development') {
    cachedRepositories[req.user.accessToken] = ret;
  }
  res.json(ret);
});

const cachedLabels = {};
app.get('/api/repos/:owner/:repository/labels', ensureLoggedIn, async (req, res) => {
  if (cachedLabels[req.params.repository]) {
    return res.json(cachedLabels[req.params.repository]);
  }
  const data = await graphql(GRAPHQL_QUERY_GET_LABELS, { owner: req.params.owner, name: req.params.repository, headers: { authorization: `token ${req.user.accessToken}` } });
  const ret = {
    existingLabels: data.repository.labels.nodes.reduce(reduceToObject('name'), {}),
    newLabels: [...data.repository.labels.nodes, ...OFFICIAL_LABELS].reduce(reduceToObject('name'), {})
  };
  if (app.get('env') === 'development') {
    cachedLabels[req.params.repository] = ret;
  }
  res.json(ret);
});

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

app.listen(port, () => {
  console.log(`Server is up at port ${port}`);
});

module.exports = app;
