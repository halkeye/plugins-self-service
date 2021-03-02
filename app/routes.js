const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { graphql } = require('@octokit/graphql');
const yaml = require('js-yaml');

const OFFICIAL_LABELS = yaml.load(fs.readFileSync(path.join(__dirname, '..', 'labels.yaml'))).labels;
const GRAPHQL_QUERY_GET_REPOS = fs.readFileSync(path.join(__dirname, '..', 'graphql', 'repos.graphql')).toString();
const GRAPHQL_QUERY_GET_LABELS = fs.readFileSync(path.join(__dirname, '..', 'graphql', 'getLabels.graphql')).toString();
const GRAPHQL_QUERY_GET_TOPICS = fs.readFileSync(path.join(__dirname, '..', 'graphql', 'getTopics.graphql')).toString();
const GRAPHQL_QUERY_UPDATE_TOPICS = fs.readFileSync(path.join(__dirname, '..', 'graphql', 'updateTopics.graphql')).toString();
let POSSIBLE_TOPICS = fetchPossibleTopics();

function fetchPossibleTopics () {
  return fetch('https://plugins.jenkins.io/api/labels')
    .then(response => response.json())
    .then(data => data.labels)
    .then(labels => labels.sort((a, b) => a.id.localeCompare(b.id)));
}
setTimeout(() => { POSSIBLE_TOPICS = fetchPossibleTopics(); }, 3600000); // fetch new labels every hour

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

const getLabels = async (req, res) => {
  const data = await graphql(GRAPHQL_QUERY_GET_LABELS, { owner: req.params.owner, name: req.params.repository, headers: { authorization: `token ${req.user.accessToken}` } });
  const ret = {
    existingLabels: data.repository.labels.nodes.reduce(reduceToObject('name'), {}),
    newLabels: [...data.repository.labels.nodes, ...OFFICIAL_LABELS].reduce(reduceToObject('name'), {})
  };
  res.json(ret);
};

const updateLabels = async (req, res) => {
  const { repositoryId, existingLabels } = await graphql(
    GRAPHQL_QUERY_GET_LABELS, {
      owner: req.params.owner,
      name: req.params.repository,
      headers: { authorization: `token ${req.user.accessToken}` }
    }
  ).then(data => {
    return {
      repositoryId: data.repository.id,
      existingLabels: data.repository.labels.nodes.reduce(reduceToObject('name'), {})
    };
  });

  const mutations = [];
  const fields = [];
  const options = {
    headers: {
      authorization: `token ${req.user.accessToken}`,
      accept: 'application/vnd.github.bane-preview+json'
    }
  };

  OFFICIAL_LABELS.forEach((label, idx) => {
    fields.push(`$clientMutationId${idx}: String!, $color${idx}: String, $description${idx}: String, $name${idx}: String!`);
    options[`clientMutationId${idx}`] = uuidv4();
    options[`color${idx}`] = label.color;
    options[`description${idx}`] = label.description;
    options[`name${idx}`] = label.name;

    if (existingLabels[label.name]) {
      // update
      options[`id${idx}`] = existingLabels[label.name].id;
      fields.push(`$id${idx}: ID!`);
      mutations.push(`label${idx}: updateLabel(input: {clientMutationId: $clientMutationId${idx}, color: $color${idx}, description: $description${idx}, id: $id${idx}, name: $name${idx}})`);
    } else {
      mutations.push(`label${idx}: createLabel(input: {clientMutationId: $clientMutationId${idx}, color: $color${idx}, description: $description${idx}, name: $name${idx}, repositoryId: $repositoryId${idx}})`);
      options[`repositoryId${idx}`] = repositoryId;
      fields.push(`$repositoryId${idx}: ID!`);
    }
    mutations.push('{ clientMutationId }');
  });
  const body = `mutation(${fields.join(',\n')}) {\n${mutations.join('\n')}\n}`;
  try {
    await graphql(body, options);
    res.json({ ok: 1 });
  } catch (err) {
    console.error('Error updating labels', err);
    res.json({ ok: 0, message: err.toString() });
  }
};

const getTopics = async (req, res) => {
  const data = await graphql(GRAPHQL_QUERY_GET_TOPICS, { owner: req.params.owner, name: req.params.repository, headers: { authorization: `token ${req.user.accessToken}` } });
  const ret = {
    existingTopics: data.repository.repositoryTopics.nodes
      .map(node => node.topic)
      .map(topic => { topic.name = topic.name.replace(/^jenkins-/i, ''); return topic; })
      .reduce(reduceToObject('name'), {}),
    possibleTopics: await POSSIBLE_TOPICS
  };
  res.json(ret);
};

const updateTopics = async (req, res) => {
  const data = await graphql(GRAPHQL_QUERY_GET_TOPICS, { owner: req.params.owner, name: req.params.repository, headers: { authorization: `token ${req.user.accessToken}` } });
  const repositoryId = data.repository.id;
  const possibleTopics = await POSSIBLE_TOPICS.then(topics => topics.reduce(reduceToObject('id'), {}));
  // filter out any topics that are not in the list of all labels so we can re-apply them
  const extraTopics = data.repository.repositoryTopics.nodes.map(node => node.topic.name.replace(/^jenkins-/i, '')).filter(n => !possibleTopics[n]);

  const options = {
    clientMutationId: uuidv4(),
    repositoryId: repositoryId,
    topicNames: extraTopics.concat(req.body.topicNames.map(topicName => `jenkins-${topicName}`)),
    headers: {
      authorization: `token ${req.user.accessToken}`,
      accept: 'application/vnd.github.bane-preview+json'
    }
  };

  try {
    await graphql(GRAPHQL_QUERY_UPDATE_TOPICS, options);
    res.json({ ok: 1 });
  } catch (err) {
    console.error('Error updating labels', err);
    res.json({ ok: 0, message: err.toString() });
  }
};

module.exports = {
  getRepos,
  getLabels,
  updateLabels,
  getTopics,
  updateTopics
};
