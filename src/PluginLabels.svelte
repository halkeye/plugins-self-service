<script>
  import '@material/mwc-button';
  import '@material/mwc-dialog';
  import '@material/mwc-list';

  export let open = false;
  export let name;
  export let owner;

  const handleClosed = (e, ...args) => console.log('closed', e.detail, ...args);
  const handleClosing = (e, ...args) => console.log('closing', e.detail, ...args);
</script>

<main>
  <mwc-dialog id="dialog2" heading="Actions" open={open} on:closed={handleClosed} on:closing={handleClosing}>
      <table>
        <thead>
          <tr>
            <th>Existing Label</th>
            <th>New Label</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>a</td>
            <td>b</td>
          </tr>
        </tbody>
      </table>
    <p>
      By setting the dialogAction="my-action" attribute on any element projected into
      mwc-dialog, you can close the dialog by clicking on that element. The
      dialog will then fire a non-bubbling "closing" event and a non-bubbling
      "closed" event with an event detail of action: "my-action"
      <mwc-list multi={true}>
        <mwc-list-item>Item 0</mwc-list-item>
        <mwc-list-item>{owner}</mwc-list-item>
        <mwc-list-item>{name}</mwc-list-item>
      </mwc-list>
    </p>
    <mwc-button slot="primaryAction" dialogAction="apply">Apply</mwc-button>
    <mwc-button slot="secondaryAction" dialogAction="cancel">Cancel</mwc-button>
  </mwc-dialog>
</main>

<style>
</style>

