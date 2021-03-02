<script>
import '@material/mwc-circular-progress';
import '@material/mwc-top-app-bar';
import '@material/mwc-icon-button';

import RepoList from './RepoList.svelte';
import { hasAny } from 'svelte-fetch';

</script>

<style>
  main {
    padding: 8px;
  }
  .codeLink {
    color: white;
  }
</style>

<mwc-top-app-bar>
  <div slot="title" id="title">Plugins Self Service</div>
  <a class="codeLink" slot="actionItems" href="https://github.com/halkeye/plugins-self-service"><mwc-icon-button icon="code" label="github"></mwc-icon-button></a>

  <main>
    <RepoList></RepoList>
    {#if $hasAny}
    <mwc-dialog heading="Request In Progress" open={true}>
      <mwc-circular-progress indeterminate={true}></mwc-circular-progress>
      <p>Working</p>
    </mwc-dialog>
    {/if}
  </main>
</mwc-top-app-bar>
