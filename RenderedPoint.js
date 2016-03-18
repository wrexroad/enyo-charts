enyo.kind({
  name: "RenderedPoint", kind: "enyo.Canvas",
  attributes: {
    width: 0,
    height: 0
  },
  published: {
    shape: "circle",
    color: "black",
    fill: false,
    size: 3
  },
  observers: {
    draw: ["shape", "color", "fill", "size"]
  },
  rendered: function() {
    this.inherited(arguments);
    this.ctx = this.node.getContext('2d');
    
    this.draw();
  },
  clear: function() {
    this.setAttribute("height", this.size << 1);
    this.setAttribute("width", this.size << 1);
    this.update();
    this.ctx.clearRect(0, 0, this.width, this.height);
  },
  draw: function() {
    this.clear();
   
    this.ctx.save();
    
    this.ctx.lineWidth = 1;
    
    this[this.shape]();
    
    if (this.fill) {
      this.ctx.fillStyle = this.color;
      this.ctx.fill();
    } else {
      this.ctx.strokeStyle = this.color;
      this.ctx.stroke();
    }
    
    this.ctx.restore();
  },
  circle: function() {
    var halfSize = this.size / 2;
    this.ctx.beginPath();
    this.ctx.arc(this.size, this.size, halfSize, 0, 6.283185307179586);
  }
});