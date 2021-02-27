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

<main>
  {#await fetchRepos()}
    <mwc-circular-progress indeterminate={true}></mwc-circular-progress>
    <p>...grabbing a list of plugins you have admin on</p>
  {:then repos}
    <table>
    {#each repos as repo}
      <tr>
        <td>{repo.name}</td>
        <td><mwc-button data-owner={repo.owner} data-name={repo.name} on:click={handlePluginLabelClick} label="Github Labels" raised={true}></mwc-button></td>
        <td><mwc-button data-owner={repo.owner} data-name={repo.name} on:click={handlePluginLabelClick} label="Plugin Labels" raised={true}></mwc-button></td>
      </tr>
    {/each}
    </table>
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

<style>
</style>

