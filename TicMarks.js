enyo.kind({
  name: "TicMarks",
  kind: "Component",
  published: {
    min: 0,
    max: 0,
    decimalPlaces: 0,
    type: "",
    tics: null
  },
  constructor: function(opts) {
    this.inherited(arguments);
    
    //create a place to store generated tics
    this.tics = [];
    
    //set some defaults if the constructor was not configured
    if (!this.type) {
      this.type = "function";
      this.formatFunction = function(val) {
        return (+val).toFixed(this.decimalPlaces);
      }
    }
    
    //create the internal format function
    this._formatter = null;
    this.setFormatter(opts.formatter || this.defaultFormat);
  },
  
  observers: {
    getDecimalPlaces: ["min", "max"]
  },
  getDecimalPlaces: function() {
    var
      max = this.max + "",
      min = this.min + "",
      maxDecLocation = (max).indexOf("."),
      minDecLocation = (min).indexOf("."),
      maxDecPlaces = maxDecLocation > 0 ? max.length - maxDecLocation : 0,
      minDecPlaces = minDecLocation > 0 ? min.length - minDecLocation : 0;
      
    this.decimalPlaces = Math.max(minDecPlaces, maxDecPlaces) || 0;
  },
  formatterChanged: function(oldVal) {
    this.inherited(arguments);
    this.setFormatter(this.formatter);
  },
  setFormatter: function(formatter) {
    if (!formatter || !formatter.type) {
      this.setFormatter(this.defaultFormat);
    }
    this.formatter = formatter;
    console.log(arguments);
    console.log(this.formatter);
    
    formatter.type = formatter
    if (formatter.type == "continuous") {
      this._formatter = function (val, min, max) {
        this.formatter.format(val, min, max, formatter.options);
      }
    } else if (formatter.type == "range") {
      this._formatter = function (val, min, max) {
        this.formatter.format(val, min, max, formatter.options);
      }
    } else if (formatter.type == "discrete") {
      
    }
  }
});