<script>
  import Fetch from 'svelte-fetch';
  import '@material/mwc-button';
  import '@material/mwc-dialog';
  import '@material/mwc-list';
  import '@material/mwc-icon';
  import '@material/mwc-circular-progress';
  import GithubLabels from './GithubLabels.svelte';
  import PluginLabels from './PluginLabels.svelte';

  let selected = null;
  const fetch = new Fetch();

  const fetchRepos = () => {
    return fetch.request('/api/repos').then(response => response.json()).then(data => data.repos);
  };
  const handleGithubLabelClick = (e) => {
    selected = { ...e.target.dataset, type: 'githubLabels' };
  };
  const handlePluginLabelClick = (e) => {
    selected = { ...e.target.dataset, type: 'pluginLabels' };
  };
  const handleClosed = (e, ...args) => {
    selected = null;
  };
</script>

<svelte:head>
</svelte:head>

<style>
  .row {
    display: grid;
    grid-template-columns: auto;
    height: auto;
    grid-gap: 5px;
    margin-bottom: 5px;
  }
  @media only screen and (min-width: 410px) and (max-width: 615px) {
    .row {
      grid-template-columns: auto auto;
    }
    .row div:first-child {
      grid-column-start: 1;
      grid-column-end: 3;
    }
  }
  @media only screen and (min-width: 615px) {
    .row {
      grid-template-columns: 200px 200px 200px;
    }
  }
  .row mwc-button {
    width: 100%;
  }
</style>

<main>
  {#await fetchRepos()}
    <p>...grabbing a list of plugins you have admin on</p>
  {:then repos}
    {#each repos as repo}
    <div class="row">
      <div><a href={`https://github.com/${repo.owner}/${repo.name}/`}>{repo.name}</a></div>
      <div><mwc-button data-owner={repo.owner} data-name={repo.name} on:click={handleGithubLabelClick} label="Github Labels" raised={true}></mwc-button></div>
      <div><mwc-button data-owner={repo.owner} data-name={repo.name} on:click={handlePluginLabelClick} label="Plugin Labels" raised={true}></mwc-button></div>
    </div>
    {/each}
    {#if selected && selected.type === 'githubLabels'}
      <GithubLabels owner={selected.owner} name={selected.name} on:closed={handleClosed}></GithubLabels>
    {/if}
    {#if selected && selected.type === 'pluginLabels'}
      <PluginLabels owner={selected.owner} name={selected.name} on:closed={handleClosed}></PluginLabels>
    {/if}
  {:catch error}
      <p>An error occurred!</p>
      <pre>
        <xmp>
          {error}
        </xmp>
      </pre>
  {/await}
</main>

