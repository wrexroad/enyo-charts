enyo.kind({
	name: "SampleSwitcher",
  components: [
    {
      kind: "onyx.Toolbar", components: [{
        kind: "onyx.Button",
        ontap: "switchPanel",
        content: "XY - Scatter",
        panelID: "0"
      }]
    }
  ],
  events: {
    onSwitchSample: ""
  },
  switchPanel: function(inSender, inEvent) {
    this.doSwitchSample(inSender.panelID);
    return true;
  }
});
