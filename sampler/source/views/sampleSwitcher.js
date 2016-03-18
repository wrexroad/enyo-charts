enyo.kind({
	name: "SampleSwitcher",
  components: [
    {kind: "onyx.Toolbar", components: [
      {content: "XY Plots"}
    ]},
    {kind: "onyx.Toolbar", components: [
      {
        kind: "onyx.Button",
        content: "Line (Plot Options)",
        style: "width: 90%",
        panelID: "0",
        ontap: "switchPanel"
      }
    ]},
    {kind: "onyx.Toolbar", components: [
      {
        kind: "onyx.Button",
        content: "Line (Multi Data)",
        style: "width: 90%",
        panelID: "1",
        ontap: "switchPanel"
      }
    ]}
  ],
  events: {
    onSwitchSample: ""
  },
  switchPanel: function(inSender, inEvent) {
    this.doSwitchSample(inSender.panelID);
    return true;
  }
});
