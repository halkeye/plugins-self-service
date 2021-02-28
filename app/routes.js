const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { graphql } = require('@octokit/graphql');
const yaml = require('js-yaml');

const OFFICIAL_LABELS = yaml.load(fs.readFileSync(path.join(__dirname, '..', 'labels.yaml'))).labels;
const GRAPHQL_QUERY_GET_REPOS = fs.readFileSync(path.join(__dirname, '..', 'graphql', 'repos.graphql')).toString();
const GRAPHQL_QUERY_GET_LABELS = fs.readFileSync(path.join(__dirname, '..', 'graphql', 'getLabels.graphql')).toString();

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

const cachedRepositories = {};
const getRepos = async (req, res) => {
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
  if (res.locals.env === 'development') {
    cachedRepositories[req.user.accessToken] = ret;
  }
  res.json(ret);
};
const cachedLabels = {};
const getLabels = async (req, res) => {
  if (cachedLabels[req.params.repository]) {
    return res.json(cachedLabels[req.params.repository]);
  }
  const data = await graphql(GRAPHQL_QUERY_GET_LABELS, { owner: req.params.owner, name: req.params.repository, headers: { authorization: `token ${req.user.accessToken}` } });
  const ret = {
    existingLabels: data.repository.labels.nodes.reduce(reduceToObject('name'), {}),
    newLabels: [...data.repository.labels.nodes, ...OFFICIAL_LABELS].reduce(reduceToObject('name'), {})
  };
  if (res.locals.env === 'development') {
    cachedLabels[req.params.repository] = ret;
  }
  res.json(ret);
};

const updateLabels = async (req, res) => {
  req.params.owner = 'halkeye';
  req.params.repository = 'testrepo';

  const existingLabels = (await graphql(
    GRAPHQL_QUERY_GET_LABELS, {
      owner: req.params.owner,
      name: req.params.repository,
      headers: { authorization: `token ${req.user.accessToken}` }
    }
  )).repository.labels.nodes.reduce(reduceToObject('name'), {});

  const mutations = [];
  const fields = [];
  const options = {
    headers: {
      authorization: `token ${req.user.accessToken}`
    }
  };
  OFFICIAL_LABELS.forEach((label, idx) => {
    options[`clientMutationId${idx}`] = uuidv4();
    options[`color${idx}`] = label.color;
    options[`description${idx}`] = label.description;
    options[`name${idx}`] = label.name;

    if (existingLabels[label.name]) {
      // update
      options[`id${idx}`] = label.id;
      mutations.push(`label${idx}: updateLabel(input: {clientMutationId: $clientMutationId${idx}, color: $color${idx}, description: $description${idx}, id: $id${idx}, name: $name${idx}})`);
      fields.push(`$clientMutationId${idx}: String!, $color${idx}: String!, $description${idx}: String!, $name${idx}: String!`);
    } else {
      mutations.push(`label${idx}: addLabel(input: {clientMutationId: $clientMutationId${idx}, color: $color${idx}, description: $description${idx}, name: $name${idx}})`);
      fields.push(`$clientMutationId${idx}: String!, $color${idx}: String!, $description${idx}: String!, $id${idx}: ID!, $name${idx}: String!`);
    }
  });
  const body = `mutation(${fields.join(',\n')}) {\n${mutations.join('\n')}\n}`;
  res.type('text/plain').send(body);
};

module.exports = {
  getRepos,
  getLabels,
  updateLabels
};
