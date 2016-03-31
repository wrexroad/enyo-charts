enyo.kind({
  name: "TicMarks",
  kind: "Component",
  published: {
    min: 0,
    max: 0,
    fractionDigits: 0,
    type: "",
    tics: null,
    formatter: null
  },
  constructor: function(opts) {
    this.inherited(arguments);
    
    //create a place to store generated tics
    this.tics = [];
    
    //create the internal format function
    this._format = null;
    this.setFormatter(opts.formatter || this.defaultFormat);
  },
  
  defaultFormat: {
    type: "function",
    formatFunction: function(val) {
      return (+val).toFixed(this.fractionDigits);
    }
  },
  
  observers: {
    getFractionDigits: ["min", "max"],
  },
  getFractionDigits: function() {
    var
      max = this.max + "",
      min = this.min + "",
      maxDecLocation = (max).indexOf("."),
      minDecLocation = (min).indexOf("."),
      maxDecPlaces = maxDecLocation > 0 ? max.length - maxDecLocation : 0,
      minDecPlaces = minDecLocation > 0 ? min.length - minDecLocation : 0;
      
    this.fractionDigits = Math.max(minDecPlaces, maxDecPlaces) || 0;
  },
  
  setFormatter: function(formatter) {
    
    if (!formatter || !formatter.type) {
      this.setDefaultFormatter();
      return;
    }
    this.formatter = formatter;
    
    if (formatter.type == "function") {
      this._format = function (val) {
        //when we generate a tic mark, call the provided function with 
        //'this' pointing a the formatter object.
        //The function should be ready to take the parameters:
        //value, min tic mark, and max tic mark
        formatter.formatFunction.call(formatter, val, this.min, this.max);
      }
    } else if (formatter.type == "range") {
      if (!formatter.labels) {
        this.setDefaultFormatter();
        return;
      }
      
      this._format = function (val) {
        var labelObj, label_i;
        
        for (label_i in formatter.labels) {
          labelObj = formatter.labels[label_i] || {};
          if (val >= labelObj.min && val <= labelObj.max) {
            return label_i;
          }
        }
        
        return "";
      }
    } else if (formatter.type == "discrete") {
      if (!formatter.labels) {
        this.setDefaultFormatter();
        return;
      }
      
      this._format = function (val) {
        var
          distances = {},
          label_i, result;
        
        //get the distance from each label's value to the target
        for (label_i in formatter.labels) {
          distances[Math.abs(formatter.labels[label_i].value - val)] = label_i;
        }
        
        //return the closest label to the target
        result = formatter.labels[Math.min.apply(this, distances.keys())];
        return result === 0 ? "0" : (result || "");
      }
    }
  },
  setDefaultFormatter: function() {
    this.setFormatter(
      this.defaultFormat.type ?
        this.defaultFormat : {type: "function", formatFunction: function(){}}
    );
  }
});