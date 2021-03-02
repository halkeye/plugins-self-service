<script>
import { createEventDispatcher } from 'svelte';
import Fetch from 'svelte-fetch';
import '@material/mwc-button';
import '@material/mwc-dialog';
import '@material/mwc-list';
import '@material/mwc-list/mwc-check-list-item';

export let name;
export let owner;

const dispatch = createEventDispatcher();

const fetch = new Fetch();

let possibleTopics;
let existingTopics;

const fetchTopics = (owner, name) => fetch.request(`/api/repos/${owner}/${name}/topics`)
  .then(response => response.json())
  .then(data => {
    possibleTopics = data.possibleTopics;
    existingTopics = data.existingTopics;
    return data;
  });

const handleApply = async (e) => {
  const data = await fetch.request(`/api/repos/${owner}/${name}/topics`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ topicNames: Object.keys(existingTopics) })
  }).then(response => response.json());

  if (!data.ok) {
    alert(data.message);
    return;
  }
  dispatch('closed');
};

const onSelected = (e) => {
  const selected = Array.from(e.detail.index);
  existingTopics = Object.fromEntries(selected.map(idx => [possibleTopics[idx].id, 1]));
};
</script>

<style>
  .styled {
    --mdc-dialog-min-width: max(50vw, 300px);
  }
</style>

<main>
  <mwc-dialog heading="Labels" open={true} on:closed class="styled">
    {#await fetchTopics(owner, name)}
      <p>...grabbing a list labels for {name}</p>
    {:then}
      <mwc-list multi={true} on:selected={onSelected}>
        {#each possibleTopics as topic}
          <mwc-check-list-item selected={existingTopics[topic.id]} twoline={true}>
            <span>{topic.id}</span>
            {#if topic.title}
            <span slot="secondary">{topic.title}</span>
            {/if}
          </mwc-check-list-item>
        {/each}
      </mwc-list>
    {:catch error}
      <p>An error occurred!</p>
      <pre>
        <xmp>
          {error}
        </xmp>
      </pre>
    {/await}
    <mwc-button slot="primaryAction" on:click={handleApply}>Apply</mwc-button>
    <mwc-button slot="secondaryAction" dialogAction="cancel">Cancel</mwc-button>
  </mwc-dialog>
</main>
