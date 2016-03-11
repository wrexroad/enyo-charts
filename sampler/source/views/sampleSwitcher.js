enyo.kind({
	name: "SampleSwitcher",
  components: [
    {
      kind: "onyx.Toolbar", components: [{
        kind: "onyx.Button",
        ontap: "switchPanel",
        content: "XY - Scatter (Plot Options)",
        panelID: "0"
      }]
    },
    {
      kind: "onyx.Toolbar", components: [{
        kind: "onyx.Button",
        ontap: "switchPanel",
        content: "XY - Scatter (Multi Data)",
        panelID: "1"
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
