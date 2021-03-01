<script>
import '@material/mwc-circular-progress';
import RepoList from './RepoList.svelte';
import { hasAny } from 'svelte-fetch';
</script>

<main>
  <RepoList></RepoList>
  {#if $hasAny}
  <mwc-dialog heading="Request In Progress" open={true}>
    <mwc-circular-progress indeterminate={true}></mwc-circular-progress>
    <p>Working</p>
  </mwc-dialog>
  {/if}
</main>

<style>
</style>
