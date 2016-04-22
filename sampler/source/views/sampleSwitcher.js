enyo.kind({
	name: "SampleSwitcher",
  components: [
    {kind: "onyx.Toolbar", components: [
      {content: "XY Plots"}
    ]},
    {kind: "onyx.Toolbar", components: [{
        kind: "onyx.Button",
        style: "width: 95%",
        content: "Scatter (Plot Details)",
        panelID: "0",
        ontap: "switchPanel"
      }]
    },
    {kind: "onyx.Toolbar", components: [{
        kind: "onyx.Button",
        style: "width: 95%",
        content: "Scatter (Multi Data)",
        panelID: "1",
        ontap: "switchPanel"
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
