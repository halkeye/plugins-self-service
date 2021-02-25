<script>
  import '@material/mwc-button';
  import '@material/mwc-dialog';
  import '@material/mwc-list';
  import PluginLabels from './PluginLabels.svelte';

  const fetchRepos = () => fetch('/api/repos').then(response => response.json()).then(data => data.repos);
  const handlePluginLabelClick = (e) => {
    console.log('data', e.target.dataset.repo);
  };
</script>

<svelte:head>
  <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css">
</svelte:head>

<main>
  {#await fetchRepos()}
      <p>...grabbing a list of plugins you have admin on</p>
  {:then repos}
    <table>
    {#each repos as repo}
      <tr>
        <td>{repo.name}</td>
        <td><mwc-button data-repo={repo.name} on:click={handlePluginLabelClick} label="Setup Standard Labels" raised={true}></mwc-button></td>
      </tr>
    {/each}
    </table>
    <PluginLabels owner="jenkinsci" name="digitalocean-plugin" open={false}></PluginLabels>
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
  main {
    text-align: center;
    padding: 1em;
    max-width: 240px;
    margin: 0 auto;
  }

  @media (min-width: 640px) {
    main {
      max-width: none;
    }
  }
</style>
