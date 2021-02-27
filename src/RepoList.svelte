<script>
  import '@material/mwc-button';
  import '@material/mwc-dialog';
  import '@material/mwc-list';
  import '@material/mwc-icon';
  import '@material/mwc-circular-progress';
  import PluginLabels from './PluginLabels.svelte';

  let selected = null;

  const fetchRepos = () => fetch('/api/repos').then(response => response.json()).then(data => data.repos);
  const handlePluginLabelClick = (e) => {
    selected = { ...e.target.dataset };
  };
  const handleClosed = (e, ...args) => {
    selected = null;
    console.log('closed', e.detail, ...args);
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
    <mwc-circular-progress indeterminate={true}></mwc-circular-progress>
    <p>...grabbing a list of plugins you have admin on</p>
  {:then repos}
    {#each repos as repo}
    <div class="row">
      <div>{repo.name}</div>
      <div><mwc-button data-owner={repo.owner} data-name={repo.name} on:click={handlePluginLabelClick} label="Github Labels" raised={true}></mwc-button></div>
      <div><mwc-button data-owner={repo.owner} data-name={repo.name} on:click={handlePluginLabelClick} label="Plugin Labels" raised={true}></mwc-button></div>
    </div>
    {/each}
    {#if selected}
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

