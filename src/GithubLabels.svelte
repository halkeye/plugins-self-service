<script>
  import Fetch from 'svelte-fetch';
  import '@material/mwc-button';
  import '@material/mwc-dialog';
  import '@material/mwc-list';
  import '@material/mwc-icon';
  import '@material/mwc-circular-progress';

  export let name;
  export let owner;

  const fetch = new Fetch();
  const fetchLabels = (owner, name) => fetch.request(`/api/repos/${owner}/${name}/labels`).then(response => response.json());
  /* icons: add, remove */
</script>

<style>
  .styled {
    --mdc-dialog-max-width: 700px;
    --mdc-dialog-min-width: 700px;
  }
  td.operator {
    width: 30px;
    min-width: 30px;
    max-width: 30px;
  }
  td.data {
    width: 300px;
    max-width: 300px;
    min-width: 300px;
  }
</style>

<main>
  <mwc-dialog heading="Labels" open={true} on:closed class="styled">
    {#await fetchLabels(owner, name)}
      <p>...grabbing a list labels for {name}</p>
    {:then labels}
      <table>
        {#each Object.keys(labels.newLabels).sort() as label}
          <tr>
            <td class="data">
              <mwc-list>
                <mwc-list-item twoline={true} noninteractive={true} hasMeta={true}>
                  {#if labels.existingLabels[label]}
                  <span>{labels.existingLabels[label].name || ''}</span>
                  <span slot="secondary">{labels.existingLabels[label].description || ''}</span>
                  {#if labels.existingLabels[label].color}
                  <span slot="meta" style="color: #{labels.existingLabels[label].color}" class="material-icons">info</span>
                  {/if}
                  {/if}
                </mwc-list-item>
              </mwc-list>
            </td>
            <td class="operator">
              <mwc-icon>double_arrow</mwc-icon>
            </td>
            <td class="data">
              <mwc-list>
                <mwc-list-item twoline={true} noninteractive={true} hasMeta={true}>
                  <span>{labels.newLabels[label].name || ''}</span>
                  <span slot="secondary">{labels.newLabels[label].description || ''}</span>
                  <span slot="meta" style="color: #{labels.newLabels[label].color}" class="material-icons">info</span>
                </mwc-list-item>
              </mwc-list>
            </td>
          </tr>
        {/each}
      </table>
    {:catch error}
      <p>An error occurred!</p>
      <pre>
        <xmp>
          {error}
        </xmp>
      </pre>
    {/await}
    <mwc-button slot="primaryAction" dialogAction="applyLabels">Apply</mwc-button>
    <mwc-button slot="secondaryAction" dialogAction="cancel">Cancel</mwc-button>
  </mwc-dialog>
</main>
