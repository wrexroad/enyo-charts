enyo.kind({
	name: "myapp.MainView",
	kind: "FittableColumns",
  handlers: {
    onSwitchSample: "switchSample"
  },
  components: [
    {kind: "SampleSwitcher", classes: "sample-switcher"},
    {
      kind: "Panels",
      name: "samples",
      arrangerKind: "CollapsingArranger",
      classes: "sliding-panels",
      wrap: false,
      fit: true,
      components: [
        {kind: "XYScatterSample"}
      ]
    }
	],
  switchSample: function(inSender, inEvent) {
    this.$.samples.set("index", inEvent)
    return true;
  }
});
